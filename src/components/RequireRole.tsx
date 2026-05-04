import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useRole } from "@/lib/useRole";
import { AppRole } from "@/lib/permissions";

interface Props {
  roles: AppRole[];
  children: ReactNode;
  fallback?: ReactNode;
}

export default function RequireRole({ roles, children, fallback }: Props) {
  const { role, loading } = useRole();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }
  if (!role || !roles.includes(role)) {
    if (fallback) return <>{fallback}</>;
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}
