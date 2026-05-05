import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/lib/useRole";
import AppLayout from "@/components/AppLayout";
import PageHeader from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Search, Phone, Mail, Building2, Clock } from "lucide-react";

const roleColors: Record<string, string> = { admin: "bg-destructive/10 text-destructive", super_admin: "bg-destructive/10 text-destructive", manager: "bg-purple-500/10 text-purple-600", sales_manager: "bg-purple-500/10 text-purple-600", sales: "bg-blue-500/10 text-blue-600", sales_agent: "bg-blue-500/10 text-blue-600", operations: "bg-amber-500/10 text-amber-600", accountant: "bg-emerald-500/10 text-emerald-600", finance: "bg-emerald-500/10 text-emerald-600", marketing: "bg-pink-500/10 text-pink-600", viewer: "bg-muted text-muted-foreground", customer: "bg-pink-500/10 text-pink-600" };
const roleLabels: Record<string, string> = { admin: "مدير عام", super_admin: "مدير النظام", manager: "مدير قسم", sales_manager: "مدير مبيعات", sales: "مبيعات", sales_agent: "مندوب مبيعات", operations: "عمليات", accountant: "محاسب", finance: "مالية", marketing: "تسويق", viewer: "مشاهد", customer: "عميل" };

type Employee = {
  id: string; full_name: string; email: string | null; phone: string | null;
  position: string | null; department: string | null; bio: string | null;
  work_schedule: string | null; avatar_url: string | null; is_active: boolean;
  role?: string;
};

export default function EmployeeDirectory() {
  const nav = useNavigate();
  const { isAdmin } = useRole();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => { (async () => {
    const [profilesRes, rolesRes] = await Promise.all([
      supabase.from("profiles").select("*").order("full_name"),
      supabase.from("user_roles").select("user_id, role"),
    ]);
    const roleMap = new Map<string, string>();
    (rolesRes.data || []).forEach((r: any) => roleMap.set(r.user_id, r.role));
    setEmployees((profilesRes.data || []).map((p: any) => ({ ...p, role: roleMap.get(p.id) || "viewer" })));
  })(); }, []);

  const filtered = employees.filter(e => (isAdmin || e.is_active) && (
    e.full_name.toLowerCase().includes(search.toLowerCase()) ||
    (e.email || "").toLowerCase().includes(search.toLowerCase()) ||
    (e.department || "").toLowerCase().includes(search.toLowerCase())
  ));
  const initials = (n: string) => n.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);

  return (
    <AppLayout>
      <PageHeader title="دليل الموظفين" description="انقر على الموظف لعرض الملف الشخصي الموحد" />
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
              <TableHead>الدور</TableHead><TableHead>جدول العمل</TableHead><TableHead>التواصل</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">لا يوجد موظفون</TableCell></TableRow>
            ) : (
              filtered.map((emp) => (
                <TableRow key={emp.id} className="animate-fade-in cursor-pointer hover:bg-accent/40" onClick={() => nav(`/employees/${emp.id}`)}>
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
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </AppLayout>
  );
}
