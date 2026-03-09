import { useRole } from "@/lib/useRole";
import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";

type AppRole = "admin" | "sales" | "operations" | "viewer";

interface RoleGuardProps {
  children: ReactNode;
  allowedRoles: AppRole[];
  fallback?: string;
}

export default function RoleGuard({ children, allowedRoles, fallback = "/" }: RoleGuardProps) {
  const { role, loading } = useRole();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!role || !allowedRoles.includes(role)) {
    return <Navigate to={fallback} replace />;
  }

  return <>{children}</>;
}
