import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Check if user account is active — runs outside onAuthStateChange to avoid deadlock
  const checkAccountActive = async (userSession: Session) => {
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_active")
        .eq("id", userSession.user.id)
        .single();

      if (profile && profile.is_active === false) {
        await supabase.auth.signOut();
        toast.error("Your account has been deactivated. Please contact an administrator.");
        setSession(null);
        setLoading(false);
        return;
      }
    } catch {
      // Profile may not exist yet — allow through
    }
    setSession(userSession);
    setLoading(false);
  };

  useEffect(() => {
    // IMPORTANT: Do NOT make async Supabase calls inside onAuthStateChange
    // — it causes a deadlock with the auth token refresh.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session) {
          // Defer the profile check to avoid deadlock
          setTimeout(() => checkAccountActive(session), 0);
          if (event === "SIGNED_IN") {
            setTimeout(() => {
              supabase.from("audit_logs" as any).insert({
                user_id: session.user.id,
                user_email: session.user.email,
                action: "login",
                entity_type: "auth",
              }).then(() => {});
            }, 0);
          }
        } else {
          if (event === "SIGNED_OUT") {
            const prev = session as any;
            // best-effort logout audit (user already signed out, may fail RLS)
          }
          setSession(null);
          setLoading(false);
        }
      }
    );

    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        checkAccountActive(session);
      } else {
        setSession(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("audit_logs" as any).insert({
        user_id: user.id,
        user_email: user.email,
        action: "logout",
        entity_type: "auth",
      });
    }
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !session) {
      navigate("/login");
    }
  }, [session, loading, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!session) return null;
  return <>{children}</>;
}
