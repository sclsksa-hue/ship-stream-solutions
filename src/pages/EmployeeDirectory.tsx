import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useRole } from "@/lib/useRole";
import AppLayout from "@/components/AppLayout";
import PageHeader from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Search, Phone, Mail, Building2, Clock, Pencil, KeyRound } from "lucide-react";
import EmployeeEditDialog, { EmployeeRecord } from "@/components/EmployeeEditDialog";
import AdminPasswordResetDialog from "@/components/AdminPasswordResetDialog";

const roleColors: Record<string, string> = { admin: "bg-destructive/10 text-destructive", super_admin: "bg-destructive/10 text-destructive", manager: "bg-purple-500/10 text-purple-600", sales_manager: "bg-purple-500/10 text-purple-600", sales: "bg-blue-500/10 text-blue-600", sales_agent: "bg-blue-500/10 text-blue-600", operations: "bg-amber-500/10 text-amber-600", accountant: "bg-emerald-500/10 text-emerald-600", finance: "bg-emerald-500/10 text-emerald-600", marketing: "bg-pink-500/10 text-pink-600", viewer: "bg-muted text-muted-foreground", customer: "bg-pink-500/10 text-pink-600" };
const roleLabels: Record<string, string> = { admin: "مدير عام", super_admin: "مدير النظام", manager: "مدير قسم", sales_manager: "مدير مبيعات", sales: "مبيعات", sales_agent: "مندوب مبيعات", operations: "عمليات", accountant: "محاسب", finance: "مالية", marketing: "تسويق", viewer: "مشاهد", customer: "عميل" };

type Employee = EmployeeRecord & { role?: string; created_at: string };

export default function EmployeeDirectory() {
  const { user } = useAuth();
  const { isAdmin } = useRole();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [search, setSearch] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const [selected, setSelected] = useState<Employee | null>(null);

  const load = async () => {
    const [profilesRes, rolesRes] = await Promise.all([
      supabase.from("profiles").select("*").order("full_name"),
      supabase.from("user_roles").select("user_id, role"),
    ]);
    const roleMap = new Map<string, string>();
    (rolesRes.data || []).forEach((r: any) => roleMap.set(r.user_id, r.role));
    setEmployees((profilesRes.data || []).map((p: any) => ({ ...p, role: roleMap.get(p.id) || "viewer" })));
  };
  useEffect(() => { load(); }, []);

  const filtered = employees.filter(e => e.is_active && (
    e.full_name.toLowerCase().includes(search.toLowerCase()) ||
    (e.email || "").toLowerCase().includes(search.toLowerCase()) ||
    (e.department || "").toLowerCase().includes(search.toLowerCase())
  ));
  const initials = (n: string) => n.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
  const managers = employees.map(e => ({ id: e.id, full_name: e.full_name }));

  const openEdit = (emp: Employee) => { setSelected(emp); setEditOpen(true); };
  const openPw = (emp: Employee) => { setSelected(emp); setPwOpen(true); };

  return (
    <AppLayout>
      <PageHeader title="دليل الموظفين" description="عرض أعضاء الفريق ومعلومات التواصل" />
      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="بحث بالاسم، البريد، القسم..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-9" />
        </div>
        <Badge variant="secondary">{filtered.length} موظف</Badge>
      </div>
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>الموظف</TableHead><TableHead>المنصب</TableHead><TableHead>القسم</TableHead>
              <TableHead>الدور</TableHead><TableHead>جدول العمل</TableHead><TableHead>التواصل</TableHead><TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">لا يوجد موظفون</TableCell></TableRow>
            ) : (
              filtered.map((emp) => {
                const canEdit = user?.id === emp.id || isAdmin;
                return (
                  <TableRow key={emp.id} className="animate-fade-in">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={emp.avatar_url || undefined} />
                          <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">{initials(emp.full_name || "?")}</AvatarFallback>
                        </Avatar>
                        <div>
                          <span className="font-medium">{emp.full_name || "—"}</span>
                          {emp.bio && <p className="text-xs text-muted-foreground line-clamp-1 max-w-[200px]">{emp.bio}</p>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{emp.position || "—"}</TableCell>
                    <TableCell>{emp.department ? <div className="flex items-center gap-1.5 text-muted-foreground"><Building2 className="h-3.5 w-3.5" />{emp.department}</div> : "—"}</TableCell>
                    <TableCell><Badge className={roleColors[emp.role || "viewer"]}>{roleLabels[emp.role || "viewer"] || emp.role}</Badge></TableCell>
                    <TableCell>{emp.work_schedule ? <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Clock className="h-3 w-3" />{emp.work_schedule}</div> : "—"}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                        {emp.email && <span className="flex items-center gap-1" dir="ltr"><Mail className="h-3 w-3" /> {emp.email}</span>}
                        {emp.phone && <span className="flex items-center gap-1" dir="ltr"><Phone className="h-3 w-3" /> {emp.phone}</span>}
                        {!emp.email && !emp.phone && "—"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {canEdit && <Button variant="ghost" size="sm" onClick={() => openEdit(emp)}><Pencil className="h-4 w-4" /></Button>}
                        {isAdmin && <Button variant="ghost" size="sm" onClick={() => openPw(emp)} title="إعادة تعيين كلمة المرور"><KeyRound className="h-4 w-4" /></Button>}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <EmployeeEditDialog open={editOpen} onOpenChange={setEditOpen} employee={selected} managers={managers} onSaved={load} />
      <AdminPasswordResetDialog open={pwOpen} onOpenChange={setPwOpen} userId={selected?.id || null} userEmail={selected?.email} userName={selected?.full_name} />
    </AppLayout>
  );
}
