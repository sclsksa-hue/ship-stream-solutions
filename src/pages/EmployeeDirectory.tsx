import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import AppLayout from "@/components/AppLayout";
import PageHeader from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Search, Phone, Mail, Building2, Clock, Pencil, Upload } from "lucide-react";

type Employee = {
  id: string; full_name: string; email: string | null; phone: string | null;
  position: string | null; department: string | null; bio: string | null;
  work_schedule: string | null; avatar_url: string | null; is_active: boolean;
  created_at: string; role?: string; manager_id?: string | null;
};

const roleColors: Record<string, string> = { admin: "bg-destructive/10 text-destructive", manager: "bg-purple-500/10 text-purple-600", sales: "bg-blue-500/10 text-blue-600", operations: "bg-amber-500/10 text-amber-600", accountant: "bg-emerald-500/10 text-emerald-600", viewer: "bg-muted text-muted-foreground", customer: "bg-pink-500/10 text-pink-600" };
const roleLabels: Record<string, string> = { admin: "مدير عام", manager: "مدير قسم", sales: "مبيعات", operations: "عمليات", accountant: "محاسب", viewer: "مشاهد", customer: "عميل" };

export default function EmployeeDirectory() {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [search, setSearch] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [form, setForm] = useState({ phone: "", position: "", department: "", bio: "", work_schedule: "" });
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const filtered = employees.filter(e => e.is_active && (e.full_name.toLowerCase().includes(search.toLowerCase()) || (e.email || "").toLowerCase().includes(search.toLowerCase()) || (e.department || "").toLowerCase().includes(search.toLowerCase())));

  const initials = (name: string) => name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

  const openEdit = (emp: Employee) => {
    setEditingEmployee(emp);
    setForm({ phone: emp.phone || "", position: emp.position || "", department: emp.department || "", bio: emp.bio || "", work_schedule: emp.work_schedule || "" });
    setEditOpen(true);
  };

  const saveProfile = async () => {
    if (!editingEmployee) return;
    const { error } = await supabase.from("profiles").update({ phone: form.phone || null, position: form.position || null, department: form.department || null, bio: form.bio || null, work_schedule: form.work_schedule || null } as any).eq("id", editingEmployee.id);
    if (error) toast.error("فشل تحديث الملف الشخصي");
    else { toast.success("تم تحديث الملف الشخصي"); setEditOpen(false); load(); }
  };

  const uploadAvatar = async (file: File) => {
    if (!editingEmployee) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `avatars/${editingEmployee.id}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("shipment-documents").upload(path, file, { upsert: true });
    if (uploadError) { toast.error("فشل الرفع"); setUploading(false); return; }
    const { data: { publicUrl } } = supabase.storage.from("shipment-documents").getPublicUrl(path);
    const { error: updateError } = await supabase.from("profiles").update({ avatar_url: publicUrl } as any).eq("id", editingEmployee.id);
    if (updateError) toast.error("فشل حفظ الصورة");
    else { toast.success("تم تحديث الصورة"); load(); setEditingEmployee({ ...editingEmployee, avatar_url: publicUrl }); }
    setUploading(false);
  };

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
              filtered.map((emp) => (
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
                  <TableCell><Badge className={roleColors[emp.role || "viewer"]}>{roleLabels[emp.role || "viewer"]}</Badge></TableCell>
                  <TableCell>{emp.work_schedule ? <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Clock className="h-3 w-3" />{emp.work_schedule}</div> : "—"}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                      {emp.email && <span className="flex items-center gap-1" dir="ltr"><Mail className="h-3 w-3" /> {emp.email}</span>}
                      {emp.phone && <span className="flex items-center gap-1" dir="ltr"><Phone className="h-3 w-3" /> {emp.phone}</span>}
                      {!emp.email && !emp.phone && "—"}
                    </div>
                  </TableCell>
                  <TableCell>{user?.id === emp.id && <Button variant="ghost" size="sm" onClick={() => openEdit(emp)}><Pencil className="h-4 w-4" /></Button>}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>تعديل ملفك الشخصي</DialogTitle></DialogHeader>
          {editingEmployee && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={editingEmployee.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary text-lg">{initials(editingEmployee.full_name || "?")}</AvatarFallback>
                </Avatar>
                <div>
                  <input type="file" accept="image/*" ref={fileInputRef} className="hidden" onChange={(e) => e.target.files?.[0] && uploadAvatar(e.target.files[0])} />
                  <Button variant="outline" size="sm" disabled={uploading} onClick={() => fileInputRef.current?.click()}>
                    <Upload className="h-4 w-4 ml-2" />{uploading ? "جاري الرفع..." : "تغيير الصورة"}
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>المنصب</Label><Input value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} placeholder="مثال: مدير مبيعات" /></div>
                <div><Label>القسم</Label><Input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} placeholder="مثال: المبيعات" /></div>
              </div>
              <div><Label>الهاتف</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+966 ..." dir="ltr" /></div>
              <div><Label>جدول العمل</Label><Input value={form.work_schedule} onChange={(e) => setForm({ ...form, work_schedule: e.target.value })} placeholder="مثال: أحد-خميس 9ص-5م" /></div>
              <div><Label>نبذة</Label><Textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder="نبذة مختصرة عنك..." rows={3} /></div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditOpen(false)}>إلغاء</Button>
                <Button onClick={saveProfile}>حفظ التغييرات</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
