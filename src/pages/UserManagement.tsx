import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/lib/useRole";
import AppLayout from "@/components/AppLayout";
import PageHeader from "@/components/PageHeader";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Shield, ShieldCheck, Users as UsersIcon, Eye, Lock } from "lucide-react";

type UserProfile = {
  id: string;
  full_name: string;
  email: string | null;
  is_active: boolean;
  created_at: string;
};

const roleLabels: Record<string, string> = {
  admin: "Admin",
  sales: "Sales",
  operations: "Operations",
  viewer: "Viewer",
};

const roleIcons: Record<string, React.ReactNode> = {
  admin: <ShieldCheck className="h-4 w-4" />,
  sales: <UsersIcon className="h-4 w-4" />,
  operations: <Shield className="h-4 w-4" />,
  viewer: <Eye className="h-4 w-4" />,
};

const roleColors: Record<string, string> = {
  admin: "bg-destructive/10 text-destructive",
  sales: "bg-blue-500/10 text-blue-600",
  operations: "bg-amber-500/10 text-amber-600",
  viewer: "bg-muted text-muted-foreground",
};

export default function UserManagement() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [userRoles, setUserRoles] = useState<Map<string, string>>(new Map());
  const { isAdmin, loading: roleLoading } = useRole();

  const load = async () => {
    const [profilesRes, rolesRes] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("*"),
    ]);
    if (profilesRes.data) setUsers(profilesRes.data as any);
    const roleMap = new Map<string, string>();
    (rolesRes.data || []).forEach((r: any) => roleMap.set(r.user_id, r.role));
    setUserRoles(roleMap);
  };

  useEffect(() => {
    if (!roleLoading) load();
  }, [roleLoading]);

  const updateRole = async (userId: string, newRole: string) => {
    if (!isAdmin) { toast.error("Only admins can change roles"); return; }
    const { error: deleteError } = await supabase.from("user_roles").delete().eq("user_id", userId);
    if (deleteError) { toast.error("Failed to update role"); return; }
    const { error: insertError } = await supabase.from("user_roles").insert({ user_id: userId, role: newRole as any });
    if (insertError) { toast.error("Failed to update role"); } else { toast.success("Role updated"); load(); }
  };

  const toggleActive = async (userId: string, isActive: boolean) => {
    if (!isAdmin) { toast.error("Only admins can change account status"); return; }
    const { error } = await supabase.from("profiles").update({ is_active: isActive } as any).eq("id", userId);
    if (error) { toast.error("Failed to update account status"); } else {
      toast.success(isActive ? "Account activated" : "Account deactivated");
      load();
    }
  };

  if (roleLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-full">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader title="User Management" description="View user roles and permissions" />

      {!isAdmin && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-800 text-sm">
          <Lock className="h-4 w-4" />
          You have read-only access. Contact an admin to make changes.
        </div>
      )}

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              {isAdmin && <TableHead>Change Role</TableHead>}
              <TableHead>Account Status</TableHead>
              <TableHead>Joined</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isAdmin ? 6 : 5} className="text-center py-8 text-muted-foreground">No users found</TableCell>
              </TableRow>
            ) : (
              users.map((user) => {
                const currentRole = userRoles.get(user.id) || "viewer";
                return (
                  <TableRow key={user.id} className="animate-fade-in">
                    <TableCell className="font-medium">{user.full_name || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{user.email || "—"}</TableCell>
                    <TableCell>
                      <Badge className={roleColors[currentRole]}>
                        <div className="flex items-center gap-1.5">
                          {roleIcons[currentRole]}
                          {roleLabels[currentRole]}
                        </div>
                      </Badge>
                    </TableCell>
                    {isAdmin && (
                      <TableCell>
                        <Select value={currentRole} onValueChange={(value) => updateRole(user.id, value)}>
                          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="sales">Sales</SelectItem>
                            <SelectItem value="operations">Operations</SelectItem>
                            <SelectItem value="viewer">Viewer</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    )}
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={user.is_active}
                          onCheckedChange={(checked) => toggleActive(user.id, checked)}
                          disabled={!isAdmin}
                        />
                        <span className={`text-xs font-medium ${user.is_active ? "text-green-600" : "text-destructive"}`}>
                          {user.is_active ? "Active" : "Disabled"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(user.created_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <div className="mt-6 rounded-lg border bg-muted/50 p-4">
        <h3 className="font-semibold mb-2">Role Permissions</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="font-medium text-destructive flex items-center gap-2 mb-1"><ShieldCheck className="h-4 w-4" /> Admin</p>
            <p className="text-muted-foreground">Full access to all features, user management, and account control</p>
          </div>
          <div>
            <p className="font-medium text-blue-600 flex items-center gap-2 mb-1"><UsersIcon className="h-4 w-4" /> Sales</p>
            <p className="text-muted-foreground">CRM module: leads, customers, opportunities, quotations</p>
          </div>
          <div>
            <p className="font-medium text-amber-600 flex items-center gap-2 mb-1"><Shield className="h-4 w-4" /> Operations</p>
            <p className="text-muted-foreground">TMS module: shipments, customs, warehousing, documents</p>
          </div>
          <div>
            <p className="font-medium text-muted-foreground flex items-center gap-2 mb-1"><Eye className="h-4 w-4" /> Viewer</p>
            <p className="text-muted-foreground">Read-only access to all modules</p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
