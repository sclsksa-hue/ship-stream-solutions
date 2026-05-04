import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { AppRole, can as canFn, canSeeField as canSeeFieldFn, canAccessPage as canAccessPageFn, Action, Resource } from "@/lib/permissions";

interface UseRoleReturn {
  role: AppRole | null;
  loading: boolean;
  isAdmin: boolean;
  isManager: boolean;
  isSales: boolean;
  isOperations: boolean;
  isAccountant: boolean;
  isViewer: boolean;
  isCustomer: boolean;
  canManageSales: boolean;
  canManageOperations: boolean;
  can: (action: Action, resource: Resource) => boolean;
  canSeeField: (field: string) => boolean;
  canAccessPage: (path: string) => boolean;
}

export function useRole(): UseRoleReturn {
  const { user } = useAuth();
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRole() {
      if (!user) { setRole(null); setLoading(false); return; }
      try {
        const { data, error } = await supabase
          .from("user_roles").select("role").eq("user_id", user.id).maybeSingle();
        if (error) { console.error("Error fetching role:", error); setRole("viewer"); }
        else setRole((data?.role as AppRole) || "viewer");
      } catch (err) {
        console.error("Error fetching role:", err);
        setRole("viewer");
      } finally { setLoading(false); }
    }
    fetchRole();
  }, [user]);

  const isAdmin = role === "admin";
  const isManager = role === "manager";
  const isSales = role === "sales";
  const isOperations = role === "operations";
  const isAccountant = role === "accountant";
  const isViewer = role === "viewer";
  const isCustomer = role === "customer";

  return {
    role, loading,
    isAdmin, isManager, isSales, isOperations, isAccountant, isViewer, isCustomer,
    canManageSales: isAdmin || isManager || isSales,
    canManageOperations: isAdmin || isOperations,
    can: (a, r) => canFn(role, a, r),
    canSeeField: (f) => canSeeFieldFn(role, f),
    canAccessPage: (p) => canAccessPageFn(role, p),
  };
}
