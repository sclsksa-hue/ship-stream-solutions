import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useRole } from "@/lib/useRole";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Upload, Briefcase, Truck, FileText, CheckSquare, Users, Trash2 } from "lucide-react";
import ConfirmDeleteDialog from "@/components/ConfirmDeleteDialog";

export type EmployeeRecord = {
  id: string; full_name: string; email: string | null; phone: string | null;
  position: string | null; department: string | null; bio: string | null;
  work_schedule: string | null; avatar_url: string | null; is_active: boolean;
  manager_id?: string | null;
};

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  employee: EmployeeRecord | null;
  managers: { id: string; full_name: string }[];
  onSaved: () => void;
}

export default function EmployeeEditDialog({ open, onOpenChange, employee, managers, onSaved }: Props) {
  const { user } = useAuth();
  const { isAdmin } = useRole();
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    full_name: "", email: "", phone: "", position: "", department: "", bio: "",
    work_schedule: "", manager_id: "none", is_active: true,
  });
  const [counts, setCounts] = useState({ tasks: 0, shipments: 0, deals: 0, quotes: 0, team: 0 });
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);

  const isSelf = user?.id === employee?.id;
  const canEditPersonal = isSelf || isAdmin;
  const canEditOrg = isAdmin;
  const canEditEmail = isAdmin && !isSelf;
  const canDelete = isAdmin && !isSelf;

  useEffect(() => {
    if (!employee) return;
    setForm({
      full_name: employee.full_name || "",
      email: employee.email || "",
      phone: employee.phone || "",
      position: employee.position || "",
      department: employee.department || "",
      bio: employee.bio || "",
      work_schedule: employee.work_schedule || "",
      manager_id: employee.manager_id || "none",
      is_active: employee.is_active,
    });
    loadLinkedCounts(employee.id);
  }, [employee]);

  const loadLinkedCounts = async (uid: string) => {
    const [tasks, shipments, deals, quotes, team] = await Promise.all([
      supabase.from("tasks").select("id", { count: "exact", head: true }).eq("assigned_to", uid),
      supabase.from("shipments").select("id", { count: "exact", head: true }).eq("assigned_to", uid),
      supabase.from("opportunities").select("id", { count: "exact", head: true }).eq("assigned_to", uid),
      supabase.from("quotations").select("id", { count: "exact", head: true }).eq("created_by", uid),
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("manager_id", uid),
    ]);
    setCounts({
      tasks: tasks.count || 0, shipments: shipments.count || 0, deals: deals.count || 0,
      quotes: quotes.count || 0, team: team.count || 0,
    });
  };

  const initials = (n: string) => n.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);

  const uploadAvatar = async (file: File) => {
    if (!employee || !canEditPersonal) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${employee.id}/avatar.${ext}`;
    const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (upErr) { toast.error("فشل رفع الصورة"); setUploading(false); return; }
    const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
    const { error } = await supabase.from("profiles").update({ avatar_url: publicUrl } as any).eq("id", employee.id);
    if (error) toast.error(error.message); else toast.success("تم تحديث الصورة");
    setUploading(false);
    onSaved();
  };

  const save = async () => {
    if (!employee) return;
    if (form.full_name.trim().length < 2) { toast.error("الاسم قصير"); return; }
    if (form.phone && !/^[+\d\s\-()]{6,20}$/.test(form.phone)) { toast.error("رقم الهاتف غير صالح"); return; }

    setBusy(true);
    const update: any = {};
    if (canEditPersonal) {
      update.full_name = form.full_name;
      update.phone = form.phone || null;
      update.bio = form.bio || null;
      update.work_schedule = form.work_schedule || null;
    }
    if (canEditOrg) {
      update.position = form.position || null;
      update.department = form.department || null;
      update.manager_id = form.manager_id === "none" ? null : form.manager_id;
      update.is_active = form.is_active;
    }
    const { error } = await supabase.from("profiles").update(update).eq("id", employee.id);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("تم الحفظ");
    onSaved();
    onOpenChange(false);
  };

  if (!employee) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>تعديل بيانات الموظف</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Avatar */}
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={employee.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary">{initials(employee.full_name || "?")}</AvatarFallback>
            </Avatar>
            {canEditPersonal && (
              <>
                <input type="file" ref={fileRef} accept="image/*" className="hidden"
                  onChange={(e) => e.target.files?.[0] && uploadAvatar(e.target.files[0])} />
                <Button variant="outline" size="sm" disabled={uploading} onClick={() => fileRef.current?.click()}>
                  <Upload className="h-4 w-4 ml-2" />{uploading ? "جاري الرفع..." : "تغيير الصورة"}
                </Button>
              </>
            )}
          </div>

          {/* Linked records */}
          <div className="grid grid-cols-5 gap-2 text-center">
            <Stat icon={CheckSquare} label="المهام" value={counts.tasks} />
            <Stat icon={Truck} label="الشحنات" value={counts.shipments} />
            <Stat icon={Briefcase} label="الصفقات" value={counts.deals} />
            <Stat icon={FileText} label="العروض" value={counts.quotes} />
            <Stat icon={Users} label="الفريق" value={counts.team} />
          </div>

          {/* Personal */}
          <Section title="البيانات الشخصية" hint={!canEditPersonal ? "للقراءة فقط" : undefined}>
            <div className="grid grid-cols-2 gap-3">
              <Field label="الاسم الكامل">
                <Input value={form.full_name} disabled={!canEditPersonal}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
              </Field>
              <Field label="البريد الإلكتروني">
                <Input value={employee.email || ""} disabled dir="ltr" />
              </Field>
              <Field label="الهاتف">
                <Input value={form.phone} disabled={!canEditPersonal} dir="ltr"
                  onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </Field>
              <Field label="جدول العمل">
                <Input value={form.work_schedule} disabled={!canEditPersonal}
                  onChange={(e) => setForm({ ...form, work_schedule: e.target.value })} />
              </Field>
            </div>
            <Field label="نبذة">
              <Textarea rows={2} value={form.bio} disabled={!canEditPersonal}
                onChange={(e) => setForm({ ...form, bio: e.target.value })} />
            </Field>
          </Section>

          {/* Organisation - admin only */}
          <Section title="البيانات الوظيفية" hint={!canEditOrg ? "للأدمن فقط" : undefined}>
            <div className="grid grid-cols-2 gap-3">
              <Field label="المنصب">
                <Input value={form.position} disabled={!canEditOrg}
                  onChange={(e) => setForm({ ...form, position: e.target.value })} />
              </Field>
              <Field label="القسم">
                <Input value={form.department} disabled={!canEditOrg}
                  onChange={(e) => setForm({ ...form, department: e.target.value })} />
              </Field>
              <Field label="المدير المباشر">
                <Select value={form.manager_id} disabled={!canEditOrg}
                  onValueChange={(v) => setForm({ ...form, manager_id: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— بدون —</SelectItem>
                    {managers.filter(m => m.id !== employee.id).map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="حالة الحساب">
                <div className="flex items-center gap-2 h-10">
                  <Switch checked={form.is_active} disabled={!canEditOrg}
                    onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
                  <Badge variant={form.is_active ? "default" : "destructive"}>
                    {form.is_active ? "نشط" : "معطل"}
                  </Badge>
                </div>
              </Field>
            </div>
          </Section>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>إلغاء</Button>
            <Button onClick={save} disabled={busy || (!canEditPersonal && !canEditOrg)}>
              {busy ? "جاري..." : "حفظ"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Stat({ icon: Icon, label, value }: any) {
  return (
    <div className="rounded-lg border bg-card p-2">
      <Icon className="h-4 w-4 mx-auto text-muted-foreground" />
      <div className="text-lg font-bold mt-1">{value}</div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
    </div>
  );
}
function Field({ label, children }: any) {
  return <div className="space-y-1"><Label className="text-xs">{label}</Label>{children}</div>;
}
function Section({ title, hint, children }: any) {
  return (
    <div className="space-y-2 rounded-lg border p-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">{title}</h4>
        {hint && <span className="text-[10px] text-muted-foreground">{hint}</span>}
      </div>
      {children}
    </div>
  );
}
