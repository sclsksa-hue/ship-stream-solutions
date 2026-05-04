import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

/**
 * Logs every page navigation to activity_logs.
 * Admin views via /audit-logs (separate page).
 */
export function useActivityTracker() {
  const { user } = useAuth();
  const location = useLocation();

  useEffect(() => {
    if (!user) return;
    // Fire-and-forget; never block UI
    supabase.from("activity_logs" as any).insert({
      user_id: user.id,
      page_visited: location.pathname,
      action: "page_view",
      metadata: { search: location.search || null },
    }).then(({ error }) => {
      if (error) console.warn("activity log failed:", error.message);
    });
  }, [user, location.pathname]);
}
