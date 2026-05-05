import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate, useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useRole } from "@/lib/useRole";
import AppLayout from "@/components/AppLayout";
import PageHeader from "@/components/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { ArrowRight, Upload, Trash2, KeyRound, FileUp, Download, ExternalLink } from "lucide-react";
import { PAGE_ACCESS, AppRole } from "@/lib/permissions";

const roleLabels: Record<string, string> = { admin: "مدير عام", super_admin: "مدير النظام", manager: "مدير قسم", sales_manager: "مدير مبيعات", sales: "مبيعات", sales_agent: "مندوب مبيعات", operations: "عمليات", accountant: "محاسب", finance: "مالية", marketing: "تسويق", viewer: "مشاهد", customer: "عميل" };
const roleOptions = Object.keys(roleLabels) as AppRole[];

type Profile = {
  id: string; full_name: string; email: string | null; phone: string | null;
  position: string | null; department: string | null; bio: string | null;
  work_schedule: string | null; avatar_url: string | null; is_active: boolean;
  manager_id: string | null; customer_id: string | null;
  hire_date: string | null; employee_code: string | null; last_login_at: string | null;
  created_at: string;
};

export default function EmployeeProfile() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const { user } = useAuth();
  const { isAdmin, isManager } = useRole();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<string>("viewer");
  const [managers, setManagers] = useState<{ id: string; full_name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const tab = params.get("tab") || "overview";

  const isSelf = user?.id === id;
  const canEditPersonal = isSelf || isAdmin;
  const canEditOrg = isAdmin;
  const canEditEmail = isAdmin && !isSelf;
  const canEditRole = isAdmin && !isSelf;
  const canDelete = isAdmin && !isSelf;
  const canViewLinks = isSelf || isAdmin || isManager;
  const canViewLogs = isAdmin;

  const load = async () => {
    if (!id) return;
    setLoading(true);
    const [p, r, mgrs] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", id).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", id).maybeSingle(),
      supabase.from("profiles").select("id, full_name").order("full_name"),
    ]);
    setProfile((p.data as any) || null);
    setRole((r.data?.role as string) || "viewer");
    setManagers((mgrs.data as any) || []);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  if (loading || !profile) {
    return <AppLayout><div className="py-20 text-center text-muted-foreground">جاري التحميل...</div></AppLayout>;
  }

  const initials = (n: string) => n.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
  const setTab = (v: string) => setParams({ tab: v });

  return (
    <AppLayout>
      <div className="flex items-center gap-2 mb-3">
        <Button variant="ghost" size="sm" onClick={() => nav("/employees")}>
          <ArrowRight className="h-4 w-4 ml-1" /> العودة للدليل
        </Button>
      </div>

      <div className="rounded-lg border bg-card p-5 mb-5">
        <div className="flex items-start gap-4">
          <Avatar className="h-20 w-20">
            <AvatarImage src={profile.avatar_url || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary text-xl">{initials(profile.full_name || "?")}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold">{profile.full_name || "—"}</h1>
              <Badge variant={profile.is_active ? "default" : "destructive"}>
                {profile.is_active ? "نشط" : "معطل"}
              </Badge>
              <Badge variant="secondary">{roleLabels[role] || role}</Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {profile.position || "—"} {profile.department && `• ${profile.department}`}
            </p>
            {profile.email && <p className="text-xs text-muted-foreground mt-1" dir="ltr">{profile.email}</p>}
          </div>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
          {(isSelf || isAdmin) && <TabsTrigger value="account">الحساب</TabsTrigger>}
          {isAdmin && <TabsTrigger value="permissions">الصلاحيات</TabsTrigger>}
          {canViewLinks && <TabsTrigger value="linking">الارتباطات</TabsTrigger>}
          {(isSelf || isAdmin) && <TabsTrigger value="documents">المستندات</TabsTrigger>}
          {canViewLogs && <TabsTrigger value="logs">السجل</TabsTrigger>}
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <OverviewTab profile={profile} canEditPersonal={canEditPersonal} canEditOrg={canEditOrg} canEditEmail={canEditEmail} canDelete={canDelete} managers={managers} onSaved={load} onDeleted={() => nav("/employees")} />
        </TabsContent>

        {(isSelf || isAdmin) && (
          <TabsContent value="account" className="mt-4">
            <AccountTab profile={profile} isSelf={isSelf} isAdmin={isAdmin} />
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="permissions" className="mt-4">
            <PermissionsTab userId={profile.id} role={role} canEdit={canEditRole} onSaved={load} />
          </TabsContent>
        )}

        {canViewLinks && (
          <TabsContent value="linking" className="mt-4">
            <LinkingTab userId={profile.id} />
          </TabsContent>
        )}

        {(isSelf || isAdmin) && (
          <TabsContent value="documents" className="mt-4">
            <DocumentsTab userId={profile.id} canWrite={isSelf || isAdmin} />
          </TabsContent>
        )}

        {canViewLogs && (
          <TabsContent value="logs" className="mt-4">
            <LogsTab userId={profile.id} />
          </TabsContent>
        )}
      </Tabs>
    </AppLayout>
  );
}

/* ───────── Overview ───────── */
function OverviewTab({ profile, canEditPersonal, canEditOrg, canEditEmail, canDelete, managers, onSaved, onDeleted }: any) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    full_name: profile.full_name || "", email: profile.email || "", phone: profile.phone || "",
    position: profile.position || "", department: profile.department || "", bio: profile.bio || "",
    work_schedule: profile.work_schedule || "", manager_id: profile.manager_id || "none",
    is_active: profile.is_active, hire_date: profile.hire_date || "", employee_code: profile.employee_code || "",
  });
  const [busy, setBusy] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [uploading, setUploading] = useState(false);

  const uploadAvatar = async (file: File) => {
    if (!canEditPersonal) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${profile.id}/avatar.${ext}`;
    const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (upErr) { toast.error("فشل رفع الصورة"); setUploading(false); return; }
    const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
    await supabase.from("profiles").update({ avatar_url: publicUrl } as any).eq("id", profile.id);
    setUploading(false);
    toast.success("تم تحديث الصورة"); onSaved();
  };

  const save = async () => {
    if (form.full_name.trim().length < 2) { toast.error("الاسم قصير"); return; }
    if (form.phone && !/^[+\d\s\-()]{6,20}$/.test(form.phone)) { toast.error("رقم الهاتف غير صالح"); return; }
    setBusy(true);
    if (canEditEmail && form.email && form.email !== (profile.email || "")) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) { setBusy(false); toast.error("بريد غير صالح"); return; }
      const { data, error } = await supabase.functions.invoke("admin-employee-manage", {
        body: { action: "update_email", user_id: profile.id, new_email: form.email },
      });
      if (error || (data as any)?.error) { setBusy(false); toast.error((data as any)?.error || error?.message || "فشل"); return; }
    }
    const update: any = {};
    if (canEditPersonal) {
      update.full_name = form.full_name; update.phone = form.phone || null;
      update.bio = form.bio || null; update.work_schedule = form.work_schedule || null;
    }
    if (canEditOrg) {
      update.position = form.position || null; update.department = form.department || null;
      update.manager_id = form.manager_id === "none" ? null : form.manager_id;
      update.is_active = form.is_active; update.hire_date = form.hire_date || null;
      update.employee_code = form.employee_code || null;
    }
    if (Object.keys(update).length > 0) {
      const { error } = await supabase.from("profiles").update(update).eq("id", profile.id);
      if (error) { setBusy(false); toast.error(error.message); return; }
    }
    setBusy(false); toast.success("تم الحفظ"); onSaved();
  };

  const handleDelete = async () => {
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("admin-employee-manage", {
      body: { action: "delete", user_id: profile.id },
    });
    setBusy(false);
    if (error || (data as any)?.error) { toast.error((data as any)?.error || error?.message || "فشل الحذف"); return; }
    toast.success("تم حذف الموظف"); setConfirmDel(false); onDeleted();
  };

  return (
    <Card>
      <CardHeader><CardTitle>البيانات الأساسية</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <input type="file" ref={fileRef} accept="image/*" className="hidden"
            onChange={(e) => e.target.files?.[0] && uploadAvatar(e.target.files[0])} />
          {canEditPersonal && (
            <Button variant="outline" size="sm" disabled={uploading} onClick={() => fileRef.current?.click()}>
              <Upload className="h-4 w-4 ml-2" />{uploading ? "جاري الرفع..." : "تغيير الصورة"}
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="الاسم الكامل"><Input value={form.full_name} disabled={!canEditPersonal}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></Field>
          <Field label={canEditEmail ? "البريد (يمكن للأدمن تعديله)" : "البريد"}>
            <Input value={form.email} disabled={!canEditEmail} dir="ltr"
              onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </Field>
          <Field label="الهاتف"><Input value={form.phone} disabled={!canEditPersonal} dir="ltr"
            onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
          <Field label="جدول العمل"><Input value={form.work_schedule} disabled={!canEditPersonal}
            onChange={(e) => setForm({ ...form, work_schedule: e.target.value })} /></Field>
          <Field label="المنصب"><Input value={form.position} disabled={!canEditOrg}
            onChange={(e) => setForm({ ...form, position: e.target.value })} /></Field>
          <Field label="القسم"><Input value={form.department} disabled={!canEditOrg}
            onChange={(e) => setForm({ ...form, department: e.target.value })} /></Field>
          <Field label="تاريخ التوظيف"><Input type="date" value={form.hire_date} disabled={!canEditOrg}
            onChange={(e) => setForm({ ...form, hire_date: e.target.value })} /></Field>
          <Field label="الرقم الوظيفي"><Input value={form.employee_code} disabled={!canEditOrg} dir="ltr"
            onChange={(e) => setForm({ ...form, employee_code: e.target.value })} /></Field>
          <Field label="المدير المباشر">
            <Select value={form.manager_id} disabled={!canEditOrg} onValueChange={(v) => setForm({ ...form, manager_id: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— بدون —</SelectItem>
                {managers.filter((m: any) => m.id !== profile.id).map((m: any) => (
                  <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="حالة الحساب">
            <div className="flex items-center gap-2 h-10">
              <Switch checked={form.is_active} disabled={!canEditOrg}
                onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
              <Badge variant={form.is_active ? "default" : "destructive"}>{form.is_active ? "نشط" : "معطل"}</Badge>
            </div>
          </Field>
        </div>
        <Field label="نبذة">
          <Textarea rows={3} value={form.bio} disabled={!canEditPersonal}
            onChange={(e) => setForm({ ...form, bio: e.target.value })} />
        </Field>

        <div className="flex justify-between gap-2 pt-2">
          <div>
            {canDelete && (
              <Button variant="destructive" onClick={() => setConfirmDel(true)} disabled={busy}>
                <Trash2 className="h-4 w-4 ml-2" /> حذف الموظف
              </Button>
            )}
          </div>
          <Button onClick={save} disabled={busy || (!canEditPersonal && !canEditOrg && !canEditEmail)}>
            {busy ? "جاري..." : "حفظ التغييرات"}
          </Button>
        </div>

        <AlertDialog open={confirmDel} onOpenChange={setConfirmDel}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>حذف الموظف</AlertDialogTitle>
              <AlertDialogDescription>
                {`سيتم حذف "${profile.full_name}" نهائياً مع حساب تسجيل الدخول. لا يمكن التراجع.`}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>إلغاء</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">حذف</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}

/* ───────── Account ───────── */
function AccountTab({ profile, isSelf, isAdmin }: any) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [adminPw, setAdminPw] = useState("");
  const [adminBusy, setAdminBusy] = useState(false);
  const [link, setLink] = useState<string | null>(null);

  const validatePw = (pw: string) =>
    pw.length >= 8 && /\d/.test(pw) && /[^A-Za-z0-9]/.test(pw);

  const selfChange = async () => {
    if (!validatePw(next)) { toast.error("8+ أحرف، رقم، رمز خاص"); return; }
    if (next !== confirm) { toast.error("تأكيد كلمة المرور غير مطابق"); return; }
    if (!profile.email) { toast.error("لا يوجد بريد للتحقق"); return; }
    setBusy(true);
    const { error: vErr } = await supabase.auth.signInWithPassword({ email: profile.email, password: current });
    if (vErr) { setBusy(false); toast.error("كلمة المرور الحالية غير صحيحة"); return; }
    const { error } = await supabase.auth.updateUser({ password: next });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("تم تحديث كلمة المرور");
    setCurrent(""); setNext(""); setConfirm("");
  };

  const adminSet = async () => {
    if (!validatePw(adminPw)) { toast.error("8+ أحرف، رقم، رمز خاص"); return; }
    setAdminBusy(true);
    const { data, error } = await supabase.functions.invoke("admin-reset-password", {
      body: { user_id: profile.id, mode: "set", new_password: adminPw },
    });
    setAdminBusy(false);
    if (error || (data as any)?.error) { toast.error((data as any)?.error || error?.message || "فشل"); return; }
    toast.success("تم تعيين كلمة المرور"); setAdminPw("");
  };

  const adminLink = async () => {
    setAdminBusy(true);
    const { data, error } = await supabase.functions.invoke("admin-reset-password", {
      body: { user_id: profile.id, mode: "link" },
    });
    setAdminBusy(false);
    if (error || (data as any)?.error) { toast.error((data as any)?.error || error?.message || "فشل"); return; }
    setLink((data as any)?.action_link || null);
    toast.success("تم إنشاء رابط الاستعادة");
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {isSelf && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><KeyRound className="h-4 w-4" /> تغيير كلمة المرور</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Field label="كلمة المرور الحالية"><Input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} dir="ltr" /></Field>
            <Field label="كلمة المرور الجديدة"><Input type="password" value={next} onChange={(e) => setNext(e.target.value)} dir="ltr" /></Field>
            <Field label="تأكيد كلمة المرور"><Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} dir="ltr" /></Field>
            <p className="text-xs text-muted-foreground">8+ أحرف، رقم، رمز خاص.</p>
            <Button onClick={selfChange} disabled={busy} className="w-full">{busy ? "جاري..." : "تحديث كلمة المرور"}</Button>
          </CardContent>
        </Card>
      )}

      {isAdmin && !isSelf && (
        <Card>
          <CardHeader><CardTitle>إعادة تعيين بواسطة الأدمن</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Field label="تعيين كلمة مرور جديدة">
              <Input type="text" value={adminPw} onChange={(e) => setAdminPw(e.target.value)} dir="ltr" placeholder="Min 8, number, symbol" />
            </Field>
            <Button onClick={adminSet} disabled={adminBusy} className="w-full">{adminBusy ? "جاري..." : "تعيين"}</Button>
            <div className="border-t pt-3">
              <Button variant="outline" onClick={adminLink} disabled={adminBusy} className="w-full">إنشاء رابط استعادة</Button>
              {link && (
                <div className="mt-2 rounded-md border bg-muted/40 p-2">
                  <code className="text-[11px] break-all" dir="ltr">{link}</code>
                  <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(link); toast.success("تم النسخ"); }}>نسخ</Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>معلومات الحساب</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <Row k="البريد" v={profile.email || "—"} ltr />
          <Row k="الحالة" v={profile.is_active ? "نشط" : "معطل"} />
          <Row k="تاريخ الإنشاء" v={new Date(profile.created_at).toLocaleString("ar-SA")} />
          <Row k="آخر دخول" v={profile.last_login_at ? new Date(profile.last_login_at).toLocaleString("ar-SA") : "—"} />
        </CardContent>
      </Card>
    </div>
  );
}

/* ───────── Permissions ───────── */
function PermissionsTab({ userId, role, canEdit, onSaved }: any) {
  const [val, setVal] = useState(role);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    await supabase.from("user_roles").delete().eq("user_id", userId);
    const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: val });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("تم تحديث الدور"); onSaved();
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>الدور الوظيفي</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <Select value={val} onValueChange={setVal} disabled={!canEdit}>
              <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
              <SelectContent>
                {roleOptions.map((r) => <SelectItem key={r} value={r}>{roleLabels[r]}</SelectItem>)}
              </SelectContent>
            </Select>
            {canEdit && <Button onClick={save} disabled={busy || val === role}>{busy ? "جاري..." : "حفظ"}</Button>}
          </div>
          <p className="text-xs text-muted-foreground">يحدد الدور الوصول للصفحات والحقول وفلاتر البيانات.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>الصفحات المتاحة لهذا الدور</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {Object.entries(PAGE_ACCESS).filter(([, roles]) => roles.includes(val)).map(([path]) => (
              <Badge key={path} variant="secondary" className="font-mono text-xs">{path}</Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ───────── Linking ───────── */
function LinkingTab({ userId }: any) {
  const [counts, setCounts] = useState({ tasks: 0, shipments: 0, deals: 0, quotes: 0, leads: 0, requests: 0, team: 0, activities: 0 });
  const [team, setTeam] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const [tasks, shipments, deals, quotes, leads, requests, activities, teamRes] = await Promise.all([
        supabase.from("tasks").select("id", { count: "exact", head: true }).eq("assigned_to", userId),
        supabase.from("shipments").select("id", { count: "exact", head: true }).eq("assigned_to", userId),
        supabase.from("opportunities").select("id", { count: "exact", head: true }).eq("assigned_to", userId),
        supabase.from("quotations").select("id", { count: "exact", head: true }).eq("created_by", userId),
        supabase.from("leads").select("id", { count: "exact", head: true }).eq("assigned_to", userId),
        supabase.from("client_requests").select("id", { count: "exact", head: true }).eq("assigned_to", userId),
        supabase.from("activities").select("id", { count: "exact", head: true }).eq("assigned_to", userId),
        supabase.from("profiles").select("id, full_name, position").eq("manager_id", userId),
      ]);
      setCounts({
        tasks: tasks.count || 0, shipments: shipments.count || 0, deals: deals.count || 0,
        quotes: quotes.count || 0, leads: leads.count || 0, requests: requests.count || 0,
        activities: activities.count || 0, team: (teamRes.data || []).length,
      });
      setTeam(teamRes.data || []);
    })();
  }, [userId]);

  const cards: { label: string; key: keyof typeof counts; href: string }[] = [
    { label: "العملاء المحتملون", key: "leads", href: "/leads" },
    { label: "الصفقات", key: "deals", href: "/opportunities" },
    { label: "العروض", key: "quotes", href: "/quotations" },
    { label: "الشحنات", key: "shipments", href: "/" },
    { label: "المهام", key: "tasks", href: "/tasks" },
    { label: "الأنشطة", key: "activities", href: "/activities" },
    { label: "طلبات العملاء", key: "requests", href: "/requests" },
    { label: "أعضاء الفريق", key: "team", href: "#" },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {cards.map((c) => (
          <Link key={c.key} to={c.href} className="rounded-lg border bg-card p-4 hover:bg-accent transition">
            <div className="text-2xl font-bold">{counts[c.key]}</div>
            <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">{c.label} <ExternalLink className="h-3 w-3" /></div>
          </Link>
        ))}
      </div>

      {team.length > 0 && (
        <Card>
          <CardHeader><CardTitle>أعضاء الفريق ({team.length})</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>الاسم</TableHead><TableHead>المنصب</TableHead><TableHead></TableHead></TableRow></TableHeader>
              <TableBody>
                {team.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>{m.full_name}</TableCell>
                    <TableCell className="text-muted-foreground">{m.position || "—"}</TableCell>
                    <TableCell><Link to={`/employees/${m.id}`} className="text-primary text-sm">عرض</Link></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* ───────── Documents ───────── */
function DocumentsTab({ userId, canWrite }: any) {
  const [files, setFiles] = useState<any[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    const { data } = await supabase.storage.from("employee-docs").list(userId, { sortBy: { column: "created_at", order: "desc" } });
    setFiles(data || []);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [userId]);

  const upload = async (file: File) => {
    setUploading(true);
    const path = `${userId}/${Date.now()}_${file.name}`;
    const { error } = await supabase.storage.from("employee-docs").upload(path, file);
    setUploading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("تم الرفع"); load();
  };

  const download = async (name: string) => {
    const { data, error } = await supabase.storage.from("employee-docs").createSignedUrl(`${userId}/${name}`, 60);
    if (error || !data) { toast.error("فشل"); return; }
    window.open(data.signedUrl, "_blank");
  };

  const remove = async (name: string) => {
    const { error } = await supabase.storage.from("employee-docs").remove([`${userId}/${name}`]);
    if (error) { toast.error(error.message); return; }
    toast.success("تم الحذف"); load();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>المستندات</span>
          {canWrite && (
            <>
              <input type="file" ref={fileRef} className="hidden"
                onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
              <Button size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
                <FileUp className="h-4 w-4 ml-2" /> {uploading ? "جاري..." : "رفع مستند"}
              </Button>
            </>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {files.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">لا توجد مستندات</p>
        ) : (
          <Table>
            <TableHeader><TableRow><TableHead>الاسم</TableHead><TableHead>التاريخ</TableHead><TableHead></TableHead></TableRow></TableHeader>
            <TableBody>
              {files.map((f) => (
                <TableRow key={f.name}>
                  <TableCell className="text-sm">{f.name.replace(/^\d+_/, "")}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{f.created_at && new Date(f.created_at).toLocaleString("ar-SA")}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => download(f.name)}><Download className="h-4 w-4" /></Button>
                      {canWrite && <Button size="sm" variant="ghost" onClick={() => remove(f.name)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

/* ───────── Logs ───────── */
function LogsTab({ userId }: any) {
  const [logs, setLogs] = useState<any[]>([]);
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("audit_logs").select("*")
        .or(`entity_id.eq.${userId},user_id.eq.${userId}`)
        .order("created_at", { ascending: false }).limit(100);
      setLogs(data || []);
    })();
  }, [userId]);

  return (
    <Card>
      <CardHeader><CardTitle>سجل التدقيق ({logs.length})</CardTitle></CardHeader>
      <CardContent>
        {logs.length === 0 ? <p className="text-sm text-muted-foreground text-center py-8">لا توجد سجلات</p> : (
          <Table>
            <TableHeader><TableRow><TableHead>التاريخ</TableHead><TableHead>الإجراء</TableHead><TableHead>الكيان</TableHead><TableHead>بواسطة</TableHead></TableRow></TableHeader>
            <TableBody>
              {logs.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="text-xs">{new Date(l.created_at).toLocaleString("ar-SA")}</TableCell>
                  <TableCell><Badge variant="outline">{l.action}</Badge></TableCell>
                  <TableCell className="text-xs">{l.entity_type}</TableCell>
                  <TableCell className="text-xs text-muted-foreground" dir="ltr">{l.user_email || "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

/* helpers */
function Field({ label, children }: any) {
  return <div className="space-y-1"><Label className="text-xs">{label}</Label>{children}</div>;
}
function Row({ k, v, ltr }: any) {
  return (
    <div className="flex justify-between border-b py-1.5 last:border-0">
      <span className="text-muted-foreground">{k}</span>
      <span dir={ltr ? "ltr" : undefined}>{v}</span>
    </div>
  );
}
