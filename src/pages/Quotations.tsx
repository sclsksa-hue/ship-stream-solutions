import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useLocation } from "react-router-dom";
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
import { toast } from "sonner";
import { Plus, Pencil, Trash2, FileDown, Download, Upload } from "lucide-react";
import { exportToCsv, exportToExcel, handleFileImport } from "@/lib/csvUtils";
import { downloadQuotationsTemplate } from "@/lib/importTemplates";
import ConfirmDeleteDialog from "@/components/ConfirmDeleteDialog";
import { useRole } from "@/lib/useRole";

type Quotation = {
  id: string; quote_number: string; customer_id: string; opportunity_id: string | null;
  status: string; total_amount: number | null; currency: string; valid_until: string | null;
  notes: string | null; origin: string | null; destination: string | null; shipment_type: string | null;
  carrier_cost: number | null; selling_price: number | null; margin: number | null; created_at: string;
  customers?: { company_name: string }; opportunities?: { title: string } | null;
};

const modes = ["fcl", "lcl", "air", "land", "multimodal"];

export default function Quotations() {
  const { canSeeField } = useRole();
  const showMoney = canSeeField("total_amount");
  const [items, setItems] = useState<Quotation[]>([]);
  const [filtered, setFiltered] = useState<Quotation[]>([]);
  const [customers, setCustomers] = useState<{ id: string; company_name: string }[]>([]);
  const [opportunities, setOpportunities] = useState<{ id: string; title: string }[]>([]);
  const [open, setOpen] = useState(false);
  const [editQuote, setEditQuote] = useState<Quotation | null>(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [form, setForm] = useState({ customer_id: "", opportunity_id: "", origin: "", destination: "", shipment_type: "", carrier_cost: "", selling_price: "", currency: "USD", valid_until: "", notes: "" });
  const { user } = useAuth();
  const location = useLocation();

  const load = async () => {
    const { data } = await supabase.from("quotations").select("*, customers(company_name), opportunities(title)").order("created_at", { ascending: false });
    if (data) setItems(data as any);
    const { data: custs } = await supabase.from("customers").select("id, company_name").order("company_name");
    if (custs) setCustomers(custs);
    const { data: opps } = await supabase.from("opportunities").select("id, title").order("title");
    if (opps) setOpportunities(opps);
  };

  useEffect(() => {
    load();
    const state = location.state as any;
    if (state?.fromOpportunity) {
      setForm(prev => ({ ...prev, ...state.fromOpportunity }));
      setOpen(true);
      window.history.replaceState({}, document.title);
      toast.info("إنشاء عرض سعر من الفرصة");
    }
  }, []);

  useEffect(() => {
    let result = items;
    if (filterStatus !== "all") result = result.filter(q => q.status === filterStatus);
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      result = result.filter(i => i.quote_number.toLowerCase().includes(q) || i.customers?.company_name?.toLowerCase().includes(q));
    }
    setFiltered(result);
  }, [items, filterStatus, searchTerm]);

  const resetForm = () => setForm({ customer_id: "", opportunity_id: "", origin: "", destination: "", shipment_type: "", carrier_cost: "", selling_price: "", currency: "USD", valid_until: "", notes: "" });

  const calcMargin = () => {
    const cc = parseFloat(form.carrier_cost); const sp = parseFloat(form.selling_price);
    if (!isNaN(cc) && !isNaN(sp)) return sp - cc; return null;
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const margin = calcMargin();
    const sellingPrice = form.selling_price ? parseFloat(form.selling_price) : null;
    const payload: any = { customer_id: form.customer_id, opportunity_id: form.opportunity_id || null, origin: form.origin || null, destination: form.destination || null, shipment_type: form.shipment_type || null, carrier_cost: form.carrier_cost ? parseFloat(form.carrier_cost) : null, selling_price: sellingPrice, margin, total_amount: sellingPrice, currency: form.currency, valid_until: form.valid_until || null, notes: form.notes || null, created_by: user?.id, quote_number: "" };
    const { error } = editQuote ? await supabase.from("quotations").update(payload).eq("id", editQuote.id) : await supabase.from("quotations").insert(payload);
    if (error) toast.error(error.message);
    else { toast.success(editQuote ? "تم تحديث عرض السعر" : "تم إنشاء عرض السعر"); setOpen(false); setEditQuote(null); resetForm(); load(); }
  };

  const deleteQuote = async (id: string) => {
    const { error } = await supabase.from("quotations").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("تم حذف عرض السعر"); load(); }
  };

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("quotations").update({ status: status as any }).eq("id", id);
    if (error) toast.error(error.message); else load();
  };

  const openEdit = (q: Quotation) => {
    setEditQuote(q);
    setForm({ customer_id: q.customer_id, opportunity_id: q.opportunity_id || "", origin: q.origin || "", destination: q.destination || "", shipment_type: q.shipment_type || "", carrier_cost: q.carrier_cost?.toString() || "", selling_price: q.selling_price?.toString() || "", currency: q.currency, valid_until: q.valid_until || "", notes: q.notes || "" });
    setOpen(true);
  };

  const exportPDF = (q: Quotation) => {
    const content = `SCLS — عرض سعر\n===========================\nرقم العرض: ${q.quote_number}\nالتاريخ: ${new Date(q.created_at).toLocaleDateString("ar-SA")}\nصالح حتى: ${q.valid_until || "غير محدد"}\n\nالعميل: ${q.customers?.company_name || "غير محدد"}\n\nالمسار: ${q.origin || "غير محدد"} → ${q.destination || "غير محدد"}\nنوع الشحنة: ${q.shipment_type?.toUpperCase() || "غير محدد"}\n\nالتسعير\n-------\nتكلفة الناقل: ${q.currency} ${q.carrier_cost?.toLocaleString() || "غير محدد"}\nسعر البيع: ${q.currency} ${q.selling_price?.toLocaleString() || "غير محدد"}\nالهامش: ${q.currency} ${q.margin?.toLocaleString() || "غير محدد"}\n\nالحالة: ${q.status}\n\nملاحظات: ${q.notes || "لا يوجد"}\n\n---\nSCLS - سرعة وإبداع في الخدمات اللوجستية`;
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `${q.quote_number}.txt`; a.click();
    URL.revokeObjectURL(url); toast.success("تم تصدير العرض");
  };

  return (
    <AppLayout>
      <PageHeader title="عروض الأسعار" description="عروض أسعار لعملائك" action={
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditQuote(null); resetForm(); } }}>
          <DialogTrigger asChild><Button><Plus className="ml-2 h-4 w-4" />عرض سعر جديد</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle className="font-display">{editQuote ? "تعديل عرض السعر" : "عرض سعر جديد"}</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>العميل *</Label>
                  <Select value={form.customer_id} onValueChange={(v) => setForm({ ...form, customer_id: v })}>
                    <SelectTrigger><SelectValue placeholder="اختر العميل" /></SelectTrigger>
                    <SelectContent>{customers.map(c => <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>الفرصة</Label>
                  <Select value={form.opportunity_id} onValueChange={(v) => setForm({ ...form, opportunity_id: v })}>
                    <SelectTrigger><SelectValue placeholder="ربط بفرصة" /></SelectTrigger>
                    <SelectContent>{opportunities.map(o => <SelectItem key={o.id} value={o.id}>{o.title}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>المصدر</Label><Input placeholder="مثال: شنغهاي" value={form.origin} onChange={e => setForm({ ...form, origin: e.target.value })} /></div>
                <div className="space-y-2"><Label>الوجهة</Label><Input placeholder="مثال: دبي" value={form.destination} onChange={e => setForm({ ...form, destination: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>نوع الشحنة</Label>
                  <Select value={form.shipment_type} onValueChange={v => setForm({ ...form, shipment_type: v })}>
                    <SelectTrigger><SelectValue placeholder="اختر" /></SelectTrigger>
                    <SelectContent>{modes.map(m => <SelectItem key={m} value={m}>{m.toUpperCase()}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>تكلفة الناقل</Label><Input type="number" value={form.carrier_cost} onChange={e => setForm({ ...form, carrier_cost: e.target.value })} dir="ltr" /></div>
                <div className="space-y-2"><Label>سعر البيع</Label><Input type="number" value={form.selling_price} onChange={e => setForm({ ...form, selling_price: e.target.value })} dir="ltr" /></div>
              </div>
              {form.carrier_cost && form.selling_price && (
                <div className="rounded-lg bg-muted p-3 text-sm">
                  <span className="text-muted-foreground">الهامش:</span>{" "}
                  <span className={`font-semibold ${(calcMargin() || 0) >= 0 ? "text-success" : "text-destructive"}`} dir="ltr">{form.currency} {calcMargin()?.toLocaleString()}</span>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>صالح حتى</Label><Input type="date" value={form.valid_until} onChange={e => setForm({ ...form, valid_until: e.target.value })} dir="ltr" /></div>
              </div>
              <div className="space-y-2"><Label>ملاحظات</Label><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
              <Button type="submit" className="w-full">{editQuote ? "تحديث عرض السعر" : "إنشاء عرض السعر"}</Button>
            </form>
          </DialogContent>
        </Dialog>
      } />

      <div className="flex gap-3 mb-4 flex-wrap items-center">
        <Input placeholder="بحث في العروض..." className="max-w-xs" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-36"><SelectValue placeholder="الحالة" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">جميع الحالات</SelectItem>
            {["draft", "sent", "accepted", "rejected", "expired"].map(s => <SelectItem key={s} value={s}><StatusBadge status={s} /></SelectItem>)}
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground mr-auto">{filtered.length} عرض سعر</span>
        <Button size="sm" variant="outline" onClick={() => handleFileImport(
          (rows) => {
            const valid: any[] = [];
            const errors: string[] = [];
            rows.forEach((row, i) => {
              const custName = (row["Customer Name"] || row["customer_name"] || "").trim();
              if (!custName) { errors.push(`سطر ${i + 2}: اسم العميل مفقود`); return; }
              const cust = customers.find(c => c.company_name.toLowerCase() === custName.toLowerCase());
              if (!cust) { errors.push(`سطر ${i + 2}: العميل "${custName}" غير موجود`); return; }
              valid.push({ customer_id: cust.id, origin: row["Origin"] || null, destination: row["Destination"] || null, shipment_type: (row["Shipment Type"] || "").toLowerCase() || null, carrier_cost: parseFloat(row["Carrier Cost"] || "0") || null, selling_price: parseFloat(row["Selling Price"] || "0") || null, margin: (parseFloat(row["Selling Price"] || "0") || 0) - (parseFloat(row["Carrier Cost"] || "0") || 0) || null, total_amount: parseFloat(row["Selling Price"] || "0") || null, currency: row["Currency"] || "USD", valid_until: row["Valid Until"] || null, notes: row["Notes"] || null, created_by: user?.id, quote_number: "" });
            });
            return { valid, errors };
          },
          async (data) => {
            const { error } = await supabase.from("quotations").insert(data);
            if (error) throw error;
            load();
          }
        )}>
          <Upload className="h-4 w-4 ml-1" />استيراد
        </Button>
        <Button size="sm" variant="outline" onClick={() => exportToCsv(filtered.map(q => ({ quote_number: q.quote_number, customer: q.customers?.company_name || "", route: q.origin && q.destination ? `${q.origin} → ${q.destination}` : "", type: q.shipment_type || "", carrier_cost: q.carrier_cost || 0, selling_price: q.selling_price || 0, margin: q.margin || 0, status: q.status })), "quotations")}>
          <Download className="h-4 w-4 ml-1" />CSV
        </Button>
        <Button size="sm" variant="outline" onClick={() => exportToExcel(filtered.map(q => ({ quote_number: q.quote_number, customer: q.customers?.company_name || "", route: q.origin && q.destination ? `${q.origin} → ${q.destination}` : "", type: q.shipment_type || "", carrier_cost: q.carrier_cost || 0, selling_price: q.selling_price || 0, margin: q.margin || 0, status: q.status })), "quotations")}>
          <Download className="h-4 w-4 ml-1" />Excel
        </Button>
        <Button size="sm" variant="ghost" onClick={downloadQuotationsTemplate}>قالب</Button>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>رقم العرض</TableHead><TableHead>العميل</TableHead><TableHead>المسار</TableHead>
              <TableHead>النوع</TableHead><TableHead>تكلفة الناقل</TableHead><TableHead>سعر البيع</TableHead>
              <TableHead>الهامش</TableHead><TableHead>الحالة</TableHead><TableHead className="text-left">إجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">لا توجد عروض أسعار</TableCell></TableRow>
            ) : (
              filtered.map(q => (
                <TableRow key={q.id} className="animate-fade-in">
                  <TableCell className="font-mono font-medium" dir="ltr">{q.quote_number}</TableCell>
                  <TableCell>{q.customers?.company_name}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{q.origin && q.destination ? `${q.origin} → ${q.destination}` : "—"}</TableCell>
                  <TableCell className="uppercase text-xs font-medium">{q.shipment_type || "—"}</TableCell>
                  <TableCell className="text-muted-foreground" dir="ltr">{!showMoney ? "—" : (q.carrier_cost ? `$${Number(q.carrier_cost).toLocaleString()}` : "—")}</TableCell>
                  <TableCell className="font-medium" dir="ltr">{!showMoney ? "—" : (q.selling_price ? `$${Number(q.selling_price).toLocaleString()}` : "—")}</TableCell>
                  <TableCell className={`font-medium ${(q.margin || 0) >= 0 ? "text-success" : "text-destructive"}`} dir="ltr">{!showMoney ? "—" : (q.margin != null ? `$${Number(q.margin).toLocaleString()}` : "—")}</TableCell>
                  <TableCell>
                    <Select value={q.status} onValueChange={v => updateStatus(q.id, v)}>
                      <SelectTrigger className="w-32 h-8"><StatusBadge status={q.status} /></SelectTrigger>
                      <SelectContent>{["draft", "sent", "accepted", "rejected", "expired"].map(s => <SelectItem key={s} value={s}><StatusBadge status={s} /></SelectItem>)}</SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-left">
                    <div className="flex items-center justify-start gap-1">
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => exportPDF(q)} title="تصدير"><FileDown className="h-3.5 w-3.5" /></Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(q)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <ConfirmDeleteDialog onConfirm={() => deleteQuote(q.id)} trigger={<Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" ><Trash2 className="h-3.5 w-3.5" /></Button>} />
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
