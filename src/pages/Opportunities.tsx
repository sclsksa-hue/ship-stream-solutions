import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
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
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, FileText } from "lucide-react";

type Opportunity = {
  id: string; customer_id: string; title: string; description: string | null;
  stage: string; estimated_value: number | null; currency: string;
  expected_close: string | null; trade_lane: string | null; mode: string | null;
  assigned_to: string | null; created_at: string;
  customers?: { company_name: string };
};

const stages = ["prospecting", "proposal", "negotiation", "won", "lost"];
const stageLabels: Record<string, string> = { prospecting: "استكشاف", proposal: "عرض", negotiation: "تفاوض", won: "مكسب", lost: "مفقود" };
const modes = ["fcl", "lcl", "air", "land", "multimodal"];
const stageColors: Record<string, string> = { prospecting: "border-r-info", proposal: "border-r-warning", negotiation: "border-r-accent", won: "border-r-success", lost: "border-r-destructive" };

export default function Opportunities() {
  const [items, setItems] = useState<Opportunity[]>([]);
  const [customers, setCustomers] = useState<{ id: string; company_name: string }[]>([]);
  const [profiles, setProfiles] = useState<{ id: string; full_name: string }[]>([]);
  const [open, setOpen] = useState(false);
  const [editOpp, setEditOpp] = useState<Opportunity | null>(null);
  const [view, setView] = useState<"table" | "kanban">("table");
  const [form, setForm] = useState({ customer_id: "", title: "", description: "", estimated_value: "", currency: "USD", expected_close: "", trade_lane: "", mode: "", assigned_to: "" });
  const { user } = useAuth();
  const navigate = useNavigate();

  const load = async () => {
    const { data } = await supabase.from("opportunities").select("*, customers(company_name)").order("created_at", { ascending: false });
    if (data) setItems(data as any);
    const { data: custs } = await supabase.from("customers").select("id, company_name").order("company_name");
    if (custs) setCustomers(custs);
    const { data: p } = await supabase.from("profiles").select("id, full_name");
    if (p) setProfiles(p);
  };

  useEffect(() => { load(); }, []);

  const resetForm = () => setForm({ customer_id: "", title: "", description: "", estimated_value: "", currency: "USD", expected_close: "", trade_lane: "", mode: "", assigned_to: "" });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: any = { customer_id: form.customer_id, title: form.title, description: form.description || null, estimated_value: form.estimated_value ? parseFloat(form.estimated_value) : null, currency: form.currency, expected_close: form.expected_close || null, trade_lane: form.trade_lane || null, mode: form.mode || null, assigned_to: form.assigned_to || user?.id };
    const { error } = editOpp ? await supabase.from("opportunities").update(payload).eq("id", editOpp.id) : await supabase.from("opportunities").insert(payload);
    if (error) toast.error(error.message);
    else { toast.success(editOpp ? "تم تحديث الفرصة" : "تم إنشاء الفرصة"); setOpen(false); setEditOpp(null); resetForm(); load(); }
  };

  const deleteOpp = async (id: string) => {
    const { error } = await supabase.from("opportunities").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("تم حذف الفرصة"); load(); }
  };

  const updateStage = async (id: string, stage: string) => {
    const { error } = await supabase.from("opportunities").update({ stage: stage as any }).eq("id", id);
    if (error) toast.error(error.message); else load();
  };

  const openEdit = (o: Opportunity) => {
    setEditOpp(o);
    setForm({ customer_id: o.customer_id, title: o.title, description: o.description || "", estimated_value: o.estimated_value?.toString() || "", currency: o.currency, expected_close: o.expected_close || "", trade_lane: o.trade_lane || "", mode: o.mode || "", assigned_to: o.assigned_to || "" });
    setOpen(true);
  };

  const profileName = (id: string | null) => profiles.find(p => p.id === id)?.full_name || "—";

  const createQuoteFromOpportunity = (o: Opportunity) => {
    navigate("/quotations", { state: { fromOpportunity: { customer_id: o.customer_id, opportunity_id: o.id, origin: o.trade_lane?.split("→")[0]?.trim() || "", destination: o.trade_lane?.split("→")[1]?.trim() || "", shipment_type: o.mode || "", notes: `عرض سعر للفرصة: ${o.title}` } } });
  };

  const grouped = stages.map((stage) => ({ stage, items: items.filter((o) => o.stage === stage), total: items.filter((o) => o.stage === stage).reduce((s, o) => s + (Number(o.estimated_value) || 0), 0) }));

  return (
    <AppLayout>
      <PageHeader title="الفرص" description="تتبع فرص المبيعات" action={
        <div className="flex items-center gap-2">
          <Tabs value={view} onValueChange={(v) => setView(v as any)}>
            <TabsList>
              <TabsTrigger value="table">جدول</TabsTrigger>
              <TabsTrigger value="kanban">كانبان</TabsTrigger>
            </TabsList>
          </Tabs>
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditOpp(null); resetForm(); } }}>
            <DialogTrigger asChild><Button><Plus className="ml-2 h-4 w-4" />إضافة فرصة</Button></DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle className="font-display">{editOpp ? "تعديل الفرصة" : "فرصة جديدة"}</DialogTitle></DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>العميل *</Label>
                    <Select value={form.customer_id} onValueChange={(v) => setForm({ ...form, customer_id: v })}>
                      <SelectTrigger><SelectValue placeholder="اختر العميل" /></SelectTrigger>
                      <SelectContent>{customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2"><Label>العنوان *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>خط التجارة</Label><Input placeholder="مثال: شنغهاي → دبي" value={form.trade_lane} onChange={(e) => setForm({ ...form, trade_lane: e.target.value })} /></div>
                  <div className="space-y-2">
                    <Label>الوضع</Label>
                    <Select value={form.mode} onValueChange={(v) => setForm({ ...form, mode: v })}>
                      <SelectTrigger><SelectValue placeholder="اختر الوضع" /></SelectTrigger>
                      <SelectContent>{modes.map(m => <SelectItem key={m} value={m}>{m.toUpperCase()}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2"><Label>القيمة المتوقعة</Label><Input type="number" value={form.estimated_value} onChange={(e) => setForm({ ...form, estimated_value: e.target.value })} dir="ltr" /></div>
                  <div className="space-y-2"><Label>تاريخ الإغلاق المتوقع</Label><Input type="date" value={form.expected_close} onChange={(e) => setForm({ ...form, expected_close: e.target.value })} dir="ltr" /></div>
                </div>
                <div className="space-y-2">
                  <Label>تعيين إلى</Label>
                  <Select value={form.assigned_to} onValueChange={(v) => setForm({ ...form, assigned_to: v })}>
                    <SelectTrigger><SelectValue placeholder="اختر الموظف" /></SelectTrigger>
                    <SelectContent>{profiles.map(p => <SelectItem key={p.id} value={p.id}>{p.full_name || p.id.slice(0, 8)}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>الوصف</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
                <Button type="submit" className="w-full">{editOpp ? "تحديث الفرصة" : "إنشاء الفرصة"}</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      } />

      {view === "table" ? (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>العنوان</TableHead><TableHead>العميل</TableHead><TableHead>خط التجارة</TableHead>
                <TableHead>الوضع</TableHead><TableHead>القيمة</TableHead><TableHead>معيّن إلى</TableHead>
                <TableHead>المرحلة</TableHead><TableHead className="text-left">إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">لا توجد فرص بعد</TableCell></TableRow>
              ) : (
                items.map((o) => (
                  <TableRow key={o.id} className="animate-fade-in">
                    <TableCell className="font-medium">{o.title}</TableCell>
                    <TableCell>{o.customers?.company_name}</TableCell>
                    <TableCell className="text-muted-foreground">{o.trade_lane || "—"}</TableCell>
                    <TableCell className="uppercase text-xs font-medium">{o.mode || "—"}</TableCell>
                    <TableCell className="font-medium" dir="ltr">{o.estimated_value ? `$${Number(o.estimated_value).toLocaleString()}` : "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{profileName(o.assigned_to)}</TableCell>
                    <TableCell>
                      <Select value={o.stage} onValueChange={(v) => updateStage(o.id, v)}>
                        <SelectTrigger className="w-36 h-8"><StatusBadge status={o.stage} /></SelectTrigger>
                        <SelectContent>{stages.map((s) => <SelectItem key={s} value={s}><StatusBadge status={s} /></SelectItem>)}</SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-left">
                      <div className="flex items-center justify-start gap-1">
                        {(o.stage === "proposal" || o.stage === "negotiation") && (
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-primary" onClick={() => createQuoteFromOpportunity(o)} title="إنشاء عرض سعر">
                            <FileText className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(o)}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => deleteOpp(o.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="grid grid-cols-5 gap-4">
          {grouped.map((col) => (
            <div key={col.stage} className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-sm font-semibold">{stageLabels[col.stage]}</h3>
                <span className="text-xs text-muted-foreground">{col.items.length}</span>
              </div>
              <p className="text-xs text-muted-foreground mb-2" dir="ltr">${col.total.toLocaleString()}</p>
              <div className="space-y-2">
                {col.items.map((o) => (
                  <Card key={o.id} className={`border-r-4 ${stageColors[col.stage]} animate-fade-in`}>
                    <CardContent className="p-3">
                      <p className="text-sm font-medium leading-tight">{o.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">{o.customers?.company_name}</p>
                      {o.trade_lane && <p className="text-xs text-muted-foreground">{o.trade_lane}</p>}
                      {o.mode && <span className="text-[10px] uppercase font-semibold bg-muted px-1.5 py-0.5 rounded mt-1 inline-block">{o.mode}</span>}
                      {o.estimated_value && <p className="text-xs font-semibold mt-2" dir="ltr">${Number(o.estimated_value).toLocaleString()}</p>}
                    </CardContent>
                  </Card>
                ))}
                {col.items.length === 0 && <div className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">لا توجد فرص</div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </AppLayout>
  );
}
