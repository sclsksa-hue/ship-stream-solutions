import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/lib/useRole";
import AppLayout from "@/components/AppLayout";
import PageHeader from "@/components/PageHeader";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Shield, ShieldCheck, Users as UsersIcon, Eye, Lock, KeyRound } from "lucide-react";
import PushNotificationSettings from "@/components/PushNotificationSettings";
import AdminPasswordResetDialog from "@/components/AdminPasswordResetDialog";

type UserProfile = { id: string; full_name: string; email: string | null; is_active: boolean; created_at: string; manager_id: string | null; };

const roleLabels: Record<string, string> = { admin: "مدير عام", manager: "مدير قسم", sales: "مبيعات", operations: "عمليات", accountant: "محاسب", viewer: "مشاهد", customer: "عميل" };
const roleIcons: Record<string, React.ReactNode> = { admin: <ShieldCheck className="h-4 w-4" />, manager: <Shield className="h-4 w-4" />, sales: <UsersIcon className="h-4 w-4" />, operations: <Shield className="h-4 w-4" />, accountant: <Shield className="h-4 w-4" />, viewer: <Eye className="h-4 w-4" />, customer: <UsersIcon className="h-4 w-4" /> };
const roleColors: Record<string, string> = { admin: "bg-destructive/10 text-destructive", manager: "bg-purple-500/10 text-purple-600", sales: "bg-blue-500/10 text-blue-600", operations: "bg-amber-500/10 text-amber-600", accountant: "bg-emerald-500/10 text-emerald-600", viewer: "bg-muted text-muted-foreground", customer: "bg-pink-500/10 text-pink-600" };

export default function UserManagement() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [userRoles, setUserRoles] = useState<Map<string, string>>(new Map());
  const [pwOpen, setPwOpen] = useState(false);
  const [pwTarget, setPwTarget] = useState<UserProfile | null>(null);
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

  useEffect(() => { if (!roleLoading) load(); }, [roleLoading]);

  const updateRole = async (userId: string, newRole: string) => {
    if (!isAdmin) { toast.error("المدراء فقط يمكنهم تغيير الأدوار"); return; }
    const { error: deleteError } = await supabase.from("user_roles").delete().eq("user_id", userId);
    if (deleteError) { toast.error("فشل تحديث الدور"); return; }
    const { error: insertError } = await supabase.from("user_roles").insert({ user_id: userId, role: newRole as any });
    if (insertError) { toast.error("فشل تحديث الدور"); } else { toast.success("تم تحديث الدور"); load(); }
  };

  const toggleActive = async (userId: string, isActive: boolean) => {
    if (!isAdmin) { toast.error("المدراء فقط يمكنهم تغيير حالة الحساب"); return; }
    const { error } = await supabase.from("profiles").update({ is_active: isActive } as any).eq("id", userId);
    if (error) { toast.error("فشل تحديث حالة الحساب"); } else { toast.success(isActive ? "تم تفعيل الحساب" : "تم تعطيل الحساب"); load(); }
  };

  const updateManager = async (userId: string, managerId: string) => {
    if (!isAdmin) return;
    const value = managerId === "none" ? null : managerId;
    const { error } = await supabase.from("profiles").update({ manager_id: value } as any).eq("id", userId);
    if (error) toast.error("فشل تعيين المدير");
    else { toast.success("تم تعيين المدير"); load(); }
  };

  if (roleLoading) return <AppLayout><div className="flex items-center justify-center h-full"><p className="text-muted-foreground">جاري التحميل...</p></div></AppLayout>;

  return (
    <AppLayout>
      <PageHeader title="إدارة المستخدمين" description="عرض أدوار المستخدمين والصلاحيات" />
      <div className="mb-6"><PushNotificationSettings /></div>
      {!isAdmin && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-800 text-sm">
          <Lock className="h-4 w-4" />لديك صلاحية القراءة فقط. تواصل مع المدير لإجراء تغييرات.
        </div>
      )}
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>المستخدم</TableHead><TableHead>البريد</TableHead><TableHead>الدور</TableHead>
              {isAdmin && <TableHead>تغيير الدور</TableHead>}
              {isAdmin && <TableHead>المدير المباشر</TableHead>}
              <TableHead>حالة الحساب</TableHead><TableHead>تاريخ الانضمام</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow><TableCell colSpan={isAdmin ? 7 : 5} className="text-center py-8 text-muted-foreground">لا يوجد مستخدمون</TableCell></TableRow>
            ) : (
              users.map((user) => {
                const currentRole = userRoles.get(user.id) || "viewer";
                const managerCandidates = users.filter((u) => u.id !== user.id && (userRoles.get(u.id) === "admin" || userRoles.get(u.id) === "manager"));
                return (
                  <TableRow key={user.id} className="animate-fade-in">
                    <TableCell className="font-medium">{user.full_name || "—"}</TableCell>
                    <TableCell className="text-muted-foreground" dir="ltr">{user.email || "—"}</TableCell>
                    <TableCell>
                      <Badge className={roleColors[currentRole]}>
                        <div className="flex items-center gap-1.5">{roleIcons[currentRole]}{roleLabels[currentRole]}</div>
                      </Badge>
                    </TableCell>
                    {isAdmin && (
                      <TableCell>
                        <Select value={currentRole} onValueChange={(value) => updateRole(user.id, value)}>
                          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {Object.entries(roleLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    )}
                    {isAdmin && (
                      <TableCell>
                        <Select value={user.manager_id || "none"} onValueChange={(value) => updateManager(user.id, value)}>
                          <SelectTrigger className="w-44"><SelectValue placeholder="بدون مدير" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">— بدون مدير —</SelectItem>
                            {managerCandidates.map((m) => <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    )}
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch checked={user.is_active} onCheckedChange={(checked) => toggleActive(user.id, checked)} disabled={!isAdmin} />
                        <span className={`text-xs font-medium ${user.is_active ? "text-green-600" : "text-destructive"}`}>{user.is_active ? "نشط" : "معطل"}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{new Date(user.created_at).toLocaleDateString("ar-SA")}</TableCell>
                    {isAdmin && (
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => { setPwTarget(user); setPwOpen(true); }} title="إعادة تعيين كلمة المرور">
                          <KeyRound className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
      <AdminPasswordResetDialog open={pwOpen} onOpenChange={setPwOpen} userId={pwTarget?.id || null} userEmail={pwTarget?.email} userName={pwTarget?.full_name} />
      <div className="hidden">

      </div>
      <div className="mt-6 rounded-lg border bg-muted/50 p-4">
        <h3 className="font-semibold mb-2">صلاحيات الأدوار</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><p className="font-medium text-destructive flex items-center gap-2 mb-1"><ShieldCheck className="h-4 w-4" /> مدير</p><p className="text-muted-foreground">وصول كامل لجميع الميزات وإدارة المستخدمين</p></div>
          <div><p className="font-medium text-blue-600 flex items-center gap-2 mb-1"><UsersIcon className="h-4 w-4" /> مبيعات</p><p className="text-muted-foreground">إدارة العملاء المحتملين والعملاء والفرص وعروض الأسعار</p></div>
          <div><p className="font-medium text-amber-600 flex items-center gap-2 mb-1"><Shield className="h-4 w-4" /> عمليات</p><p className="text-muted-foreground">إدارة العمليات والأنشطة</p></div>
          <div><p className="font-medium text-muted-foreground flex items-center gap-2 mb-1"><Eye className="h-4 w-4" /> مشاهد</p><p className="text-muted-foreground">وصول للقراءة فقط</p></div>
        </div>
      </div>
    </AppLayout>
  );
}
