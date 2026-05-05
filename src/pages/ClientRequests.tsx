import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useRole } from "@/lib/useRole";
import AppLayout from "@/components/AppLayout";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Paperclip, Upload } from "lucide-react";
import { toast } from "sonner";

type Status = "new" | "assigned" | "in_progress" | "completed" | "cancelled";
type Priority = "normal" | "urgent" | "critical";

interface ClientRequest {
  id: string;
  request_number: string;
  customer_id: string;
  quotation_id: string | null;
  service_type: string | null;
  details: string | null;
  origin: string | null;
  destination: string | null;
  required_date: string | null;
  priority: Priority;
  status: Status;
  assigned_to: string | null;
  internal_notes: string | null;
  attachments: { name: string; url: string }[];
  created_by: string | null;
  created_at: string;
}

const statusLabels: Record<Status, string> = {
  new: "جديد",
  assigned: "مُسند للعمليات",
  in_progress: "قيد التنفيذ",
  completed: "مكتمل",
  cancelled: "ملغى",
};
const statusColors: Record<Status, string> = {
  new: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  assigned: "bg-purple-500/15 text-purple-700 dark:text-purple-300",
  in_progress: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  completed: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  cancelled: "bg-red-500/15 text-red-700 dark:text-red-300",
};
const priorityLabels: Record<Priority, string> = { normal: "عادي", urgent: "عاجل", critical: "حرج" };
const priorityColors: Record<Priority, string> = {
  normal: "bg-muted text-muted-foreground",
  urgent: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  critical: "bg-red-500/15 text-red-700 dark:text-red-300",
};

export default function ClientRequests() {
  const { user } = useAuth();
  const { role, isAdmin, isSales, isOperations } = useRole();
  const [requests, setRequests] = useState<ClientRequest[]>([]);
  const [customers, setCustomers] = useState<{ id: string; company_name: string }[]>([]);
  const [quotations, setQuotations] = useState<{ id: string; quote_number: string; customer_id: string; status: string }[]>([]);
  const [opsUsers, setOpsUsers] = useState<{ id: string; full_name: string }[]>([]);
  const [profiles, setProfiles] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<ClientRequest | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const canCreate = isAdmin || isSales;
  const canEditAll = isAdmin;
  const canChangeStatus = isAdmin || isOperations;

  const [form, setForm] = useState({
    customer_id: "", quotation_id: "", service_type: "", details: "",
    origin: "", destination: "", required_date: "", priority: "normal" as Priority,
    assigned_to: "", internal_notes: "",
  });
  const [files, setFiles] = useState<File[]>([]);

  async function loadAll() {
    setLoading(true);
    const [r, c, q, p] = await Promise.all([
      supabase.from("client_requests").select("*").order("created_at", { ascending: false }),
      supabase.from("customers").select("id,company_name").order("company_name"),
      supabase.from("quotations").select("id,quote_number,customer_id,status").order("created_at", { ascending: false }),
      supabase.from("profiles").select("id,full_name"),
    ]);
    if (r.data) setRequests(r.data as any);
    if (c.data) setCustomers(c.data);
    if (q.data) setQuotations(q.data);
    if (p.data) setProfiles(new Map(p.data.map((x: any) => [x.id, x.full_name])));

    const { data: ur } = await supabase.from("user_roles").select("user_id,role").in("role", ["operations", "admin"]);
    if (ur && p.data) {
      const ids = new Set(ur.map((x: any) => x.user_id));
      setOpsUsers((p.data as any[]).filter((x) => ids.has(x.id)));
    }
    setLoading(false);
  }

  useEffect(() => { loadAll(); }, []);

  async function uploadAttachments(requestId: string): Promise<{ name: string; url: string }[]> {
    const out: { name: string; url: string }[] = [];
    for (const f of files) {
      const path = `${requestId}/${Date.now()}-${f.name}`;
      const { error } = await supabase.storage.from("shipment-documents").upload(path, f);
      if (!error) out.push({ name: f.name, url: path });
    }
    return out;
  }

  async function createRequest() {
    if (!form.customer_id) { toast.error("اختر العميل"); return; }
    const { data, error } = await supabase.from("client_requests").insert({
      customer_id: form.customer_id,
      quotation_id: form.quotation_id || null,
      service_type: form.service_type || null,
      details: form.details || null,
      origin: form.origin || null,
      destination: form.destination || null,
      required_date: form.required_date || null,
      priority: form.priority,
      assigned_to: form.assigned_to || null,
      internal_notes: form.internal_notes || null,
      created_by: user?.id,
      status: form.assigned_to ? "assigned" : "new",
    }).select().single();
    if (error) { toast.error(error.message); return; }
    if (files.length && data) {
      const atts = await uploadAttachments(data.id);
      if (atts.length) await supabase.from("client_requests").update({ attachments: atts }).eq("id", data.id);
    }
    toast.success("تم إنشاء الطلب");
    setOpen(false);
    setForm({ customer_id: "", quotation_id: "", service_type: "", details: "", origin: "", destination: "", required_date: "", priority: "normal", assigned_to: "", internal_notes: "" });
    setFiles([]);
    loadAll();
  }

  async function updateStatus(id: string, status: Status) {
    const { error } = await supabase.from("client_requests").update({ status }).eq("id", id);
    if (error) toast.error(error.message); else { toast.success("تم تحديث الحالة"); loadAll(); }
  }

  async function appendNote(id: string, note: string, current: string | null) {
    const merged = current ? `${current}\n— ${new Date().toLocaleString("ar-SA")}: ${note}` : `— ${new Date().toLocaleString("ar-SA")}: ${note}`;
    const { error } = await supabase.from("client_requests").update({ internal_notes: merged }).eq("id", id);
    if (error) toast.error(error.message); else { toast.success("تمت إضافة الملاحظة"); loadAll(); }
  }

  async function assignTo(id: string, userId: string) {
    const { error } = await supabase.from("client_requests").update({ assigned_to: userId, status: "assigned" }).eq("id", id);
    if (error) toast.error(error.message); else { toast.success("تم الإسناد"); loadAll(); }
  }

  const filtered = requests.filter((r) => filterStatus === "all" || r.status === filterStatus);
  const filteredQuotations = quotations.filter((q) => !form.customer_id || q.customer_id === form.customer_id);

  return (
    <AppLayout>
      <PageHeader title="طلبات العملاء" description="نقطة التسليم بين المبيعات والعمليات">
        {canCreate && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 ml-2" />طلب جديد</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>إنشاء طلب عميل</DialogTitle></DialogHeader>
              <div className="grid grid-cols-2 gap-4 py-4">
                <div className="col-span-2">
                  <Label>العميل *</Label>
                  <Select value={form.customer_id} onValueChange={(v) => setForm({ ...form, customer_id: v, quotation_id: "" })}>
                    <SelectTrigger><SelectValue placeholder="اختر العميل" /></SelectTrigger>
                    <SelectContent>{customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  <Label>عرض السعر المرتبط</Label>
                  <Select value={form.quotation_id} onValueChange={(v) => setForm({ ...form, quotation_id: v })}>
                    <SelectTrigger><SelectValue placeholder="اختر عرض السعر" /></SelectTrigger>
                    <SelectContent>{filteredQuotations.map((q) => <SelectItem key={q.id} value={q.id}>{q.quote_number} ({q.status})</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>نوع الخدمة</Label><Input value={form.service_type} onChange={(e) => setForm({ ...form, service_type: e.target.value })} placeholder="بحري / جوي / بري ..." /></div>
                <div>
                  <Label>الأولوية</Label>
                  <Select value={form.priority} onValueChange={(v: Priority) => setForm({ ...form, priority: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">عادي</SelectItem>
                      <SelectItem value="urgent">عاجل</SelectItem>
                      <SelectItem value="critical">حرج</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>المنشأ</Label><Input value={form.origin} onChange={(e) => setForm({ ...form, origin: e.target.value })} /></div>
                <div><Label>الوجهة</Label><Input value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} /></div>
                <div><Label>التاريخ المطلوب</Label><Input type="date" value={form.required_date} onChange={(e) => setForm({ ...form, required_date: e.target.value })} /></div>
                <div>
                  <Label>إسناد إلى (عمليات)</Label>
                  <Select value={form.assigned_to} onValueChange={(v) => setForm({ ...form, assigned_to: v })}>
                    <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>{opsUsers.map((u) => <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="col-span-2"><Label>تفاصيل الطلب</Label><Textarea value={form.details} onChange={(e) => setForm({ ...form, details: e.target.value })} /></div>
                <div className="col-span-2"><Label>ملاحظات داخلية</Label><Textarea value={form.internal_notes} onChange={(e) => setForm({ ...form, internal_notes: e.target.value })} /></div>
                <div className="col-span-2">
                  <Label>المرفقات</Label>
                  <Input type="file" multiple onChange={(e) => setFiles(Array.from(e.target.files || []))} />
                  {files.length > 0 && <p className="text-xs text-muted-foreground mt-1">{files.length} ملف محدد</p>}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
                <Button onClick={createRequest}>إنشاء</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </PageHeader>

      <div className="px-6 pb-6 space-y-4">
        <div className="flex items-center gap-3">
          <Label className="text-sm">عرض:</Label>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الحالات</SelectItem>
              {(Object.keys(statusLabels) as Status[]).map((s) => <SelectItem key={s} value={s}>{statusLabels[s]}</SelectItem>)}
            </SelectContent>
          </Select>
          <Badge variant="outline">{filtered.length} طلب</Badge>
          {role && <Badge variant="secondary" className="mr-auto">دورك: {role}</Badge>}
        </div>

        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center text-muted-foreground">جارٍ التحميل…</div>
            ) : filtered.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">لا توجد طلبات</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>رقم الطلب</TableHead>
                    <TableHead>العميل</TableHead>
                    <TableHead>الخدمة</TableHead>
                    <TableHead>المسار</TableHead>
                    <TableHead>التاريخ المطلوب</TableHead>
                    <TableHead>الأولوية</TableHead>
                    <TableHead>المسؤول</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r) => {
                    const customer = customers.find((c) => c.id === r.customer_id);
                    return (
                      <TableRow key={r.id} className="cursor-pointer" onClick={() => setSelected(r)}>
                        <TableCell className="font-mono text-xs">{r.request_number}</TableCell>
                        <TableCell>{customer?.company_name || "—"}</TableCell>
                        <TableCell>{r.service_type || "—"}</TableCell>
                        <TableCell className="text-xs">{r.origin || "?"} ← {r.destination || "?"}</TableCell>
                        <TableCell>{r.required_date || "—"}</TableCell>
                        <TableCell><Badge className={priorityColors[r.priority]}>{priorityLabels[r.priority]}</Badge></TableCell>
                        <TableCell className="text-xs">{r.assigned_to ? profiles.get(r.assigned_to) || "—" : "—"}</TableCell>
                        <TableCell><Badge className={statusColors[r.status]}>{statusLabels[r.status]}</Badge></TableCell>
                        <TableCell>{(r.attachments?.length || 0) > 0 && <Paperclip className="h-4 w-4 text-muted-foreground" />}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <span className="font-mono">{selected.request_number}</span>
                  <Badge className={statusColors[selected.status]}>{statusLabels[selected.status]}</Badge>
                  <Badge className={priorityColors[selected.priority]}>{priorityLabels[selected.priority]}</Badge>
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-xs">العميل</Label><p>{customers.find((c) => c.id === selected.customer_id)?.company_name || "—"}</p></div>
                  <div><Label className="text-xs">عرض السعر</Label><p>{quotations.find((q) => q.id === selected.quotation_id)?.quote_number || "—"}</p></div>
                  <div><Label className="text-xs">نوع الخدمة</Label><p>{selected.service_type || "—"}</p></div>
                  <div><Label className="text-xs">التاريخ المطلوب</Label><p>{selected.required_date || "—"}</p></div>
                  <div><Label className="text-xs">المنشأ</Label><p>{selected.origin || "—"}</p></div>
                  <div><Label className="text-xs">الوجهة</Label><p>{selected.destination || "—"}</p></div>
                </div>
                <div><Label className="text-xs">التفاصيل</Label><p className="whitespace-pre-wrap">{selected.details || "—"}</p></div>
                <div><Label className="text-xs">الملاحظات الداخلية</Label><p className="whitespace-pre-wrap text-muted-foreground">{selected.internal_notes || "—"}</p></div>

                {selected.attachments?.length > 0 && (
                  <div>
                    <Label className="text-xs">المرفقات</Label>
                    <ul className="text-xs space-y-1 mt-1">
                      {selected.attachments.map((a, i) => (
                        <li key={i} className="flex items-center gap-2"><Paperclip className="h-3 w-3" />{a.name}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {(canChangeStatus || canEditAll) && (
                  <div className="border-t pt-4 space-y-3">
                    <div>
                      <Label>تحديث الحالة</Label>
                      <Select value={selected.status} onValueChange={(v: Status) => updateStatus(selected.id, v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{(Object.keys(statusLabels) as Status[]).map((s) => <SelectItem key={s} value={s}>{statusLabels[s]}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    {canEditAll && (
                      <div>
                        <Label>إسناد إلى</Label>
                        <Select value={selected.assigned_to || ""} onValueChange={(v) => assignTo(selected.id, v)}>
                          <SelectTrigger><SelectValue placeholder="اختر موظف عمليات" /></SelectTrigger>
                          <SelectContent>{opsUsers.map((u) => <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                    )}
                    <NoteAdder onAdd={(note) => appendNote(selected.id, note, selected.internal_notes)} />
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

function NoteAdder({ onAdd }: { onAdd: (note: string) => void }) {
  const [note, setNote] = useState("");
  return (
    <div>
      <Label>إضافة ملاحظة</Label>
      <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="اكتب ملاحظة…" />
      <Button size="sm" className="mt-2" onClick={() => { if (note.trim()) { onAdd(note.trim()); setNote(""); } }}>
        <Upload className="h-3 w-3 ml-1" />إضافة
      </Button>
    </div>
  );
}
