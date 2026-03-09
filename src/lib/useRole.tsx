import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

type AppRole = "admin" | "sales" | "operations" | "viewer";

interface UseRoleReturn {
  role: AppRole | null;
  loading: boolean;
  isAdmin: boolean;
  isSales: boolean;
  isOperations: boolean;
  isViewer: boolean;
  canManageSales: boolean;
  canManageOperations: boolean;
}

export function useRole(): UseRoleReturn {
  const { user } = useAuth();
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRole() {
      if (!user) {
        setRole(null);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .maybeSingle();

        if (error) {
          console.error("Error fetching role:", error);
          setRole("viewer"); // Default to viewer on error
        } else {
          setRole((data?.role as AppRole) || "viewer");
        }
      } catch (err) {
        console.error("Error fetching role:", err);
        setRole("viewer");
      } finally {
        setLoading(false);
      }
    }

    fetchRole();
  }, [user]);

  const isAdmin = role === "admin";
  const isSales = role === "sales";
  const isOperations = role === "operations";
  const isViewer = role === "viewer";
  const canManageSales = isAdmin || isSales;
  const canManageOperations = isAdmin || isOperations;

  return {
    role,
    loading,
    isAdmin,
    isSales,
    isOperations,
    isViewer,
    canManageSales,
    canManageOperations,
  };
}
