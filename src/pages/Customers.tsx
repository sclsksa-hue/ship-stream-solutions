import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import PageHeader from "@/components/PageHeader";
import StatusBadge from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, DollarSign, TrendingUp, Users, Phone, Mail, Calendar, FileText, CheckSquare, Download, Upload, Briefcase, Inbox, MessageSquare, User } from "lucide-react";
import { exportToCsv, exportToExcel, handleFileImport } from "@/lib/csvUtils";
import { downloadCustomersTemplate } from "@/lib/importTemplates";
import ConfirmDeleteDialog from "@/components/ConfirmDeleteDialog";
import { useRole } from "@/lib/useRole";

type Customer = {
  id: string; company_name: string; tax_id: string | null; city: string | null;
  country: string | null; customer_type: string; status: string; category: string;
  industry: string | null; notes: string | null; created_at: string;
};

type Contact = { id: string; name: string; email: string | null; phone: string | null; position: string | null; is_primary: boolean; };
type Opportunity = { id: string; title: string; stage: string; estimated_value: number | null; };

type TimelineEvent = {
  id: string;
  type: "quotation" | "activity" | "task" | "opportunity" | "request";
  subType?: string; // e.g. call/email/meeting for activities
  title: string;
  subtitle: string;
  date: string;
  status: string;
  actor?: string | null;
  linkLabel?: string | null;
};

const CATEGORIES = ["vip", "regular", "lead"] as const;
const categoryLabels: Record<string, string> = { vip: "مميز", regular: "عادي", lead: "محتمل" };

const categoryColor: Record<string, string> = {
  vip: "bg-warning/10 text-warning",
  regular: "bg-info/10 text-info",
  lead: "bg-muted text-muted-foreground",
};

export default function Customers() {
  const { canSeeField } = useRole();
  const showMoney = canSeeField("total_amount");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [open, setOpen] = useState(false);
  const [editCust, setEditCust] = useState<Customer | null>(null);
  const [detailCust, setDetailCust] = useState<Customer | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [form, setForm] = useState({ company_name: "", tax_id: "", city: "", country: "", customer_type: "shipper", category: "regular", industry: "", notes: "" });
  const [filterCategory, setFilterCategory] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  const load = async () => {
    const { data } = await supabase.from("customers").select("*").order("created_at", { ascending: false });
    if (data) setCustomers(data as any);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    let result = customers;
    if (filterCategory !== "all") result = result.filter(c => c.category === filterCategory);
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      result = result.filter(c => c.company_name.toLowerCase().includes(q) || c.country?.toLowerCase().includes(q));
    }
    return result;
  }, [customers, filterCategory, searchTerm]);

  const categoryStats = useMemo(() => {
    const stats: Record<string, number> = { vip: 0, regular: 0, lead: 0 };
    customers.forEach(c => { stats[c.category] = (stats[c.category] || 0) + 1; });
    return stats;
  }, [customers]);

  const loadDetail = async (cust: Customer) => {
    setDetailCust(cust);
    const [contRes, oppRes, quotRes, actRes, taskRes, reqRes, profRes] = await Promise.all([
      supabase.from("contacts").select("*").eq("customer_id", cust.id).order("is_primary", { ascending: false }),
      supabase.from("opportunities").select("id, title, stage, estimated_value, assigned_to, created_at, updated_at").eq("customer_id", cust.id).order("created_at", { ascending: false }),
      supabase.from("quotations").select("id, quote_number, status, created_at, total_amount, created_by").eq("customer_id", cust.id).order("created_at", { ascending: false }),
      supabase.from("activities").select("id, activity_type, notes, activity_date, assigned_to").eq("customer_id", cust.id).order("activity_date", { ascending: false }),
      supabase.from("tasks").select("id, description, status, due_date, created_at, assigned_to").eq("customer_id", cust.id).order("created_at", { ascending: false }),
      supabase.from("client_requests").select("id, request_number, service_type, status, priority, created_at, created_by, assigned_to").eq("customer_id", cust.id).order("created_at", { ascending: false }),
      supabase.from("profiles").select("id, full_name"),
    ]);
    setContacts((contRes.data as any) || []);
    setOpportunities((oppRes.data as any) || []);

    const nameMap: Record<string, string> = {};
    (profRes.data || []).forEach((p: any) => { nameMap[p.id] = p.full_name || "—"; });
    const who = (id?: string | null) => (id ? (nameMap[id] || "—") : "—");

    const events: TimelineEvent[] = [];
    (quotRes.data || []).forEach((q: any) => events.push({
      id: q.id, type: "quotation", title: q.quote_number,
      subtitle: q.total_amount ? `$${Number(q.total_amount).toLocaleString()}` : "—",
      date: q.created_at, status: q.status, actor: who(q.created_by), linkLabel: q.quote_number,
    }));
    (actRes.data || []).forEach((a: any) => events.push({
      id: a.id, type: "activity", subType: a.activity_type,
      title: a.activity_type === "call" ? "مكالمة" : a.activity_type === "email" ? "بريد" : a.activity_type === "meeting" ? "اجتماع" : a.activity_type,
      subtitle: a.notes || "", date: a.activity_date, status: a.activity_type, actor: who(a.assigned_to),
    }));
    (taskRes.data || []).forEach((t: any) => events.push({
      id: t.id, type: "task", title: t.description, subtitle: t.due_date ? `تاريخ الاستحقاق: ${t.due_date}` : "",
      date: t.created_at, status: t.status, actor: who(t.assigned_to),
    }));
    (oppRes.data || []).forEach((o: any) => events.push({
      id: o.id, type: "opportunity", title: o.title,
      subtitle: o.estimated_value ? `$${Number(o.estimated_value).toLocaleString()}` : "—",
      date: o.created_at, status: o.stage, actor: who(o.assigned_to), linkLabel: o.title,
    }));
    (reqRes.data || []).forEach((r: any) => events.push({
      id: r.id, type: "request", title: r.request_number,
      subtitle: r.service_type || "", date: r.created_at, status: r.status,
      actor: who(r.created_by), linkLabel: r.request_number,
    }));
    events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setTimeline(events);
  };

  const resetForm = () => setForm({ company_name: "", tax_id: "", city: "", country: "", customer_type: "shipper", category: "regular", industry: "", notes: "" });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { company_name: form.company_name, tax_id: form.tax_id || null, city: form.city || null, country: form.country || null, customer_type: form.customer_type as any, category: form.category as any, industry: form.industry || null, notes: form.notes || null };
    const { error } = editCust ? await supabase.from("customers").update(payload).eq("id", editCust.id) : await supabase.from("customers").insert(payload);
    if (error) toast.error(error.message);
    else { toast.success(editCust ? "تم تحديث العميل" : "تم إنشاء العميل"); setOpen(false); setEditCust(null); resetForm(); load(); }
  };

  const deleteCust = async (id: string) => {
    const { error } = await supabase.from("customers").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("تم حذف العميل"); load(); }
  };

  const openEdit = (c: Customer) => {
    setEditCust(c);
    setForm({ company_name: c.company_name, tax_id: c.tax_id || "", city: c.city || "", country: c.country || "", customer_type: c.customer_type, category: c.category || "regular", industry: c.industry || "", notes: c.notes || "" });
    setOpen(true);
  };

  const typeIcon = (type: string, subType?: string) => {
    if (type === "quotation") return <FileText className="h-4 w-4" />;
    if (type === "activity") {
      if (subType === "call") return <Phone className="h-4 w-4" />;
      if (subType === "email") return <Mail className="h-4 w-4" />;
      if (subType === "meeting") return <Users className="h-4 w-4" />;
      return <MessageSquare className="h-4 w-4" />;
    }
    if (type === "task") return <CheckSquare className="h-4 w-4" />;
    if (type === "opportunity") return <Briefcase className="h-4 w-4" />;
    if (type === "request") return <Inbox className="h-4 w-4" />;
    return <Calendar className="h-4 w-4" />;
  };

  const typeColor: Record<string, string> = {
    quotation: "bg-info/10 text-info",
    activity: "bg-primary/10 text-primary",
    task: "bg-warning/10 text-warning",
    opportunity: "bg-success/10 text-success",
    request: "bg-accent/10 text-accent-foreground",
  };

  const typeLabels: Record<string, string> = { quotation: "عرض سعر", activity: "نشاط", task: "مهمة", opportunity: "فرصة", request: "طلب" };
  const customerTypeLabels: Record<string, string> = { shipper: "شاحن", consignee: "مستلم", both: "كلاهما" };

  return (
    <AppLayout>
      <PageHeader title="العملاء" description="قاعدة عملائك" action={
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditCust(null); resetForm(); } }}>
          <DialogTrigger asChild><Button><Plus className="ml-2 h-4 w-4" />إضافة عميل</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle className="font-display">{editCust ? "تعديل العميل" : "عميل جديد"}</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2"><Label>اسم الشركة *</Label><Input value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} required /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>الرقم الضريبي</Label><Input value={form.tax_id} onChange={(e) => setForm({ ...form, tax_id: e.target.value })} dir="ltr" /></div>
                <div className="space-y-2">
                  <Label>النوع</Label>
                  <Select value={form.customer_type} onValueChange={(v) => setForm({ ...form, customer_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(customerTypeLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>المدينة</Label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
                <div className="space-y-2"><Label>البلد</Label><Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} /></div>
                <div className="space-y-2"><Label>القطاع</Label><Input value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} /></div>
                <div className="space-y-2">
                  <Label>التصنيف</Label>
                  <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{categoryLabels[c]}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2"><Label>ملاحظات</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
              <Button type="submit" className="w-full">{editCust ? "تحديث العميل" : "إنشاء العميل"}</Button>
            </form>
          </DialogContent>
        </Dialog>
      } />

      <div className="grid gap-3 md:grid-cols-3 mb-4">
        {CATEGORIES.map(cat => (
          <Card key={cat} className={`cursor-pointer transition-all ${filterCategory === cat ? "ring-2 ring-primary" : ""}`} onClick={() => setFilterCategory(filterCategory === cat ? "all" : cat)}>
            <CardContent className="py-3 px-4 flex items-center justify-between">
              <div>
                <span className={`status-badge ${categoryColor[cat]}`}>{categoryLabels[cat]}</span>
                <p className="text-2xl font-display font-bold mt-1">{categoryStats[cat] || 0}</p>
              </div>
              <Users className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex gap-3 mb-4 flex-wrap items-center">
        <Input placeholder="بحث في العملاء..." className="max-w-xs" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        <span className="text-sm text-muted-foreground mr-auto">{filtered.length} عميل</span>
        <Button size="sm" variant="outline" onClick={() => handleFileImport(
          (rows) => {
            const valid: any[] = [];
            const errors: string[] = [];
            rows.forEach((row, i) => {
              // Build case-insensitive lookup for flexible header matching
              const r: Record<string, string> = {};
              Object.entries(row).forEach(([k, v]) => { r[String(k ?? "").trim().toLowerCase()] = String(v ?? "").trim(); });
              const name = r["company name"] || r["company_name"] || r["اسم الشركة"] || "";
              if (!name) { errors.push(`سطر ${i + 2}: اسم الشركة مفقود`); return; }
              const category = (r["category"] || r["التصنيف"] || "regular").toLowerCase();
              const validCats = ["vip", "regular", "lead"];
              valid.push({
                company_name: name,
                city: r["city"] || r["المدينة"] || null,
                country: r["country"] || r["البلد"] || null,
                industry: r["industry"] || r["القطاع"] || null,
                category: validCats.includes(category) ? category : "regular",
                notes: r["notes"] || r["ملاحظات"] || null,
                _contact_name: r["contact person"] || r["contact name"] || r["جهة الاتصال"] || "",
                _contact_phone: r["phone"] || r["الهاتف"] || "",
                _contact_email: r["email"] || r["البريد"] || "",
              });
            });
            return { valid, errors };
          },
          async (data) => {
            const customerRows = data.map(({ _contact_name, _contact_phone, _contact_email, ...rest }: any) => ({ ...rest }));
            const { data: inserted, error } = await supabase.from("customers").insert(customerRows).select("id");
            if (error) throw error;
            const contactRows: any[] = [];
            if (inserted) {
              data.forEach((row: any, i: number) => {
                if (row._contact_name && inserted[i]) contactRows.push({ customer_id: inserted[i].id, name: row._contact_name, phone: row._contact_phone || null, email: row._contact_email || null, is_primary: true });
              });
            }
            if (contactRows.length > 0) await supabase.from("contacts").insert(contactRows);
            load();
          }
        )}>
          <Upload className="h-4 w-4 ml-1" />استيراد
        </Button>
        <Button size="sm" variant="outline" onClick={() => exportToCsv(filtered.map(c => ({ company: c.company_name, type: c.customer_type, category: c.category, industry: c.industry || "", city: c.city || "", country: c.country || "", status: c.status })), "customers")}>
          <Download className="h-4 w-4 ml-1" />CSV
        </Button>
        <Button size="sm" variant="outline" onClick={() => exportToExcel(filtered.map(c => ({ company: c.company_name, type: c.customer_type, category: c.category, industry: c.industry || "", city: c.city || "", country: c.country || "", status: c.status })), "customers")}>
          <Download className="h-4 w-4 ml-1" />Excel
        </Button>
        <Button size="sm" variant="ghost" onClick={downloadCustomersTemplate}>قالب</Button>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>الشركة</TableHead><TableHead>التصنيف</TableHead><TableHead>النوع</TableHead>
              <TableHead>القطاع</TableHead><TableHead>المدينة</TableHead><TableHead>البلد</TableHead><TableHead>الحالة</TableHead><TableHead className="text-left">إجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">لا يوجد عملاء</TableCell></TableRow>
            ) : (
              filtered.map((c) => (
                <TableRow key={c.id} className="cursor-pointer" onClick={() => loadDetail(c)}>
                  <TableCell className="font-medium">{c.company_name}</TableCell>
                  <TableCell><span className={`status-badge ${categoryColor[c.category] || categoryColor.regular}`}>{categoryLabels[c.category] || c.category}</span></TableCell>
                  <TableCell>{customerTypeLabels[c.customer_type] || c.customer_type}</TableCell>
                  <TableCell className="text-muted-foreground">{c.industry || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{c.city || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{c.country || "—"}</TableCell>
                  <TableCell><StatusBadge status={c.status} /></TableCell>
                  <TableCell className="text-left" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-start gap-1">
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(c)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <ConfirmDeleteDialog onConfirm={() => deleteCust(c.id)} trigger={<Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" ><Trash2 className="h-3.5 w-3.5" /></Button>} />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!detailCust} onOpenChange={(v) => { if (!v) setDetailCust(null); }}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-display">{detailCust?.company_name}</DialogTitle></DialogHeader>
          {detailCust && (
            <>
              <div className="grid grid-cols-3 gap-3 text-sm mb-2">
                <div><span className="text-muted-foreground">النوع:</span> {customerTypeLabels[detailCust.customer_type] || detailCust.customer_type}</div>
                <div><span className="text-muted-foreground">التصنيف:</span> <span className={`status-badge ${categoryColor[detailCust.category] || categoryColor.regular}`}>{categoryLabels[detailCust.category]}</span></div>
                <div><span className="text-muted-foreground">البلد:</span> {detailCust.country || "—"}</div>
                <div><span className="text-muted-foreground">المدينة:</span> {detailCust.city || "—"}</div>
                <div><span className="text-muted-foreground">الحالة:</span> <StatusBadge status={detailCust.status} /></div>
              </div>
            </>
          )}

          <Tabs defaultValue="timeline" className="w-full">
            <TabsList className="w-full">
              <TabsTrigger value="timeline" className="flex-1">السجل ({timeline.length})</TabsTrigger>
              <TabsTrigger value="contacts" className="flex-1">جهات الاتصال ({contacts.length})</TabsTrigger>
              <TabsTrigger value="opportunities" className="flex-1">الفرص ({opportunities.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="timeline">
              <div className="relative max-h-[460px] overflow-y-auto pr-2">
                <div className="absolute right-[19px] top-2 bottom-2 w-px bg-border" />
                <div className="space-y-3">
                  {timeline.map(e => {
                    const d = new Date(e.date);
                    return (
                      <div key={`${e.type}-${e.id}`} className="relative flex items-start gap-3 pr-10">
                        <div className={`absolute right-2 top-2 h-9 w-9 rounded-full flex items-center justify-center ring-4 ring-background ${typeColor[e.type] || "bg-muted text-muted-foreground"}`}>
                          {typeIcon(e.type, e.subType)}
                        </div>
                        <div className="flex-1 min-w-0 rounded-lg border p-3 bg-card">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="text-[10px] font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{typeLabels[e.type]}</span>
                            <span className="font-medium truncate">{e.title}</span>
                            <StatusBadge status={e.status} />
                          </div>
                          {e.subtitle && <p className="text-muted-foreground text-xs mb-1">{e.subtitle}</p>}
                          <div className="flex items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
                            <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{d.toLocaleDateString("ar-SA")} {d.toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })}</span>
                            {e.actor && <span className="flex items-center gap-1"><User className="h-3 w-3" />{e.actor}</span>}
                            {e.linkLabel && <span className="flex items-center gap-1 text-primary" dir="ltr">#{e.linkLabel}</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {timeline.length === 0 && <p className="text-center text-sm text-muted-foreground py-6">لا يوجد نشاط بعد</p>}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="contacts">
              <div className="space-y-2">
                {contacts.map(c => (
                  <div key={c.id} className="flex items-center gap-3 rounded-lg border p-3 text-sm">
                    <div className="flex-1">
                      <span className="font-medium">{c.name}</span>
                      {c.is_primary && <span className="mr-2 text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">رئيسي</span>}
                      <span className="text-muted-foreground mr-2">{c.position}</span>
                    </div>
                    <span className="text-muted-foreground text-xs" dir="ltr">{c.email}</span>
                    <span className="text-muted-foreground text-xs" dir="ltr">{c.phone}</span>
                  </div>
                ))}
                {contacts.length === 0 && <p className="text-center text-sm text-muted-foreground py-4">لا توجد جهات اتصال مرتبطة</p>}
              </div>
            </TabsContent>

            <TabsContent value="opportunities">
              <div className="space-y-2">
                {opportunities.map(o => (
                  <div key={o.id} className="flex items-center gap-3 rounded-lg border p-3 text-sm">
                    <span className="font-medium flex-1">{o.title}</span>
                    <StatusBadge status={o.stage} />
                    <span className="text-sm font-medium" dir="ltr">{!showMoney ? "—" : (o.estimated_value ? `$${Number(o.estimated_value).toLocaleString()}` : "—")}</span>
                  </div>
                ))}
                {opportunities.length === 0 && <p className="text-center text-sm text-muted-foreground py-4">لا توجد فرص مرتبطة</p>}
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
