import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useNavigate, useLocation } from "react-router-dom";
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
import { Plus, Pencil, Trash2, FileDown, Ship, Download } from "lucide-react";
import { exportToCsv, exportToExcel, handleFileImport } from "@/lib/csvUtils";
import { downloadQuotationsTemplate } from "@/lib/importTemplates";

type Quotation = {
  id: string; quote_number: string; customer_id: string; opportunity_id: string | null;
  status: string; total_amount: number | null; currency: string; valid_until: string | null;
  notes: string | null; origin: string | null; destination: string | null; shipment_type: string | null;
  carrier_cost: number | null; selling_price: number | null; margin: number | null; created_at: string;
  customers?: { company_name: string }; opportunities?: { title: string } | null;
};

const modes = ["fcl", "lcl", "air", "land", "multimodal"];

export default function Quotations() {
  const [items, setItems] = useState<Quotation[]>([]);
  const [filtered, setFiltered] = useState<Quotation[]>([]);
  const [customers, setCustomers] = useState<{ id: string; company_name: string }[]>([]);
  const [opportunities, setOpportunities] = useState<{ id: string; title: string }[]>([]);
  const [open, setOpen] = useState(false);
  const [editQuote, setEditQuote] = useState<Quotation | null>(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [form, setForm] = useState({
    customer_id: "", opportunity_id: "", origin: "", destination: "", shipment_type: "",
    carrier_cost: "", selling_price: "", currency: "USD", valid_until: "", notes: "",
  });
  const { user } = useAuth();
  const navigate = useNavigate();
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
    // Check if we're coming from an opportunity
    const state = location.state as any;
    if (state?.fromOpportunity) {
      setForm(prev => ({
        ...prev,
        ...state.fromOpportunity
      }));
      setOpen(true);
      // Clear the state
      window.history.replaceState({}, document.title);
      toast.info("Creating quotation from opportunity");
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
    const payload: any = {
      customer_id: form.customer_id, opportunity_id: form.opportunity_id || null,
      origin: form.origin || null, destination: form.destination || null,
      shipment_type: form.shipment_type || null,
      carrier_cost: form.carrier_cost ? parseFloat(form.carrier_cost) : null,
      selling_price: sellingPrice, margin, total_amount: sellingPrice,
      currency: form.currency, valid_until: form.valid_until || null,
      notes: form.notes || null, created_by: user?.id, quote_number: "",
    };
    const { error } = editQuote
      ? await supabase.from("quotations").update(payload).eq("id", editQuote.id)
      : await supabase.from("quotations").insert(payload);
    if (error) toast.error(error.message);
    else { toast.success(editQuote ? "Quotation updated" : "Quotation created"); setOpen(false); setEditQuote(null); resetForm(); load(); }
  };

  const deleteQuote = async (id: string) => {
    const { error } = await supabase.from("quotations").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Quotation deleted"); load(); }
  };

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("quotations").update({ status: status as any }).eq("id", id);
    if (error) toast.error(error.message);
    else load();
  };

  const createShipmentFromQuote = (q: Quotation) => {
    navigate("/shipments", { 
      state: { 
        fromQuotation: {
          customer_id: q.customer_id,
          quotation_id: q.id,
          origin: q.origin || "",
          destination: q.destination || "",
          mode: q.shipment_type || "fcl",
          total_cost: q.carrier_cost?.toString() || "",
          total_revenue: q.selling_price?.toString() || "",
          notes: `Shipment from quote ${q.quote_number}`,
        }
      }
    });
  };

  const openEdit = (q: Quotation) => {
    setEditQuote(q);
    setForm({
      customer_id: q.customer_id, opportunity_id: q.opportunity_id || "",
      origin: q.origin || "", destination: q.destination || "",
      shipment_type: q.shipment_type || "", carrier_cost: q.carrier_cost?.toString() || "",
      selling_price: q.selling_price?.toString() || "", currency: q.currency,
      valid_until: q.valid_until || "", notes: q.notes || "",
    });
    setOpen(true);
  };

  const exportPDF = (q: Quotation) => {
    const content = `SCLS LOGISTICS - QUOTATION\n===========================\nQuote Number: ${q.quote_number}\nDate: ${new Date(q.created_at).toLocaleDateString()}\nValid Until: ${q.valid_until || "N/A"}\n\nCustomer: ${q.customers?.company_name || "N/A"}\n\nRoute: ${q.origin || "N/A"} → ${q.destination || "N/A"}\nShipment Type: ${q.shipment_type?.toUpperCase() || "N/A"}\n\nPRICING\n-------\nCarrier Cost: ${q.currency} ${q.carrier_cost?.toLocaleString() || "N/A"}\nSelling Price: ${q.currency} ${q.selling_price?.toLocaleString() || "N/A"}\nMargin: ${q.currency} ${q.margin?.toLocaleString() || "N/A"}\n\nStatus: ${q.status.toUpperCase()}\n\nNotes: ${q.notes || "None"}\n\n---\nSCLS - Speed & Creativity Logistics Solutions`;
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `${q.quote_number}.txt`; a.click();
    URL.revokeObjectURL(url); toast.success("Quote exported");
  };

  return (
    <AppLayout>
      <PageHeader title="Quotations" description="Price quotes for your customers" action={
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditQuote(null); resetForm(); } }}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />New Quote</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle className="font-display">{editQuote ? "Edit Quotation" : "New Quotation"}</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Customer *</Label>
                  <Select value={form.customer_id} onValueChange={(v) => setForm({ ...form, customer_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                    <SelectContent>{customers.map(c => <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Opportunity</Label>
                  <Select value={form.opportunity_id} onValueChange={(v) => setForm({ ...form, opportunity_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Link opportunity" /></SelectTrigger>
                    <SelectContent>{opportunities.map(o => <SelectItem key={o.id} value={o.id}>{o.title}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Origin</Label><Input placeholder="e.g. Shanghai" value={form.origin} onChange={e => setForm({ ...form, origin: e.target.value })} /></div>
                <div className="space-y-2"><Label>Destination</Label><Input placeholder="e.g. Dubai" value={form.destination} onChange={e => setForm({ ...form, destination: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Shipment Type</Label>
                  <Select value={form.shipment_type} onValueChange={v => setForm({ ...form, shipment_type: v })}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{modes.map(m => <SelectItem key={m} value={m}>{m.toUpperCase()}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Carrier Cost</Label><Input type="number" value={form.carrier_cost} onChange={e => setForm({ ...form, carrier_cost: e.target.value })} /></div>
                <div className="space-y-2"><Label>Selling Price</Label><Input type="number" value={form.selling_price} onChange={e => setForm({ ...form, selling_price: e.target.value })} /></div>
              </div>
              {form.carrier_cost && form.selling_price && (
                <div className="rounded-lg bg-muted p-3 text-sm">
                  <span className="text-muted-foreground">Margin:</span>{" "}
                  <span className={`font-semibold ${(calcMargin() || 0) >= 0 ? "text-success" : "text-destructive"}`}>{form.currency} {calcMargin()?.toLocaleString()}</span>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Valid Until</Label><Input type="date" value={form.valid_until} onChange={e => setForm({ ...form, valid_until: e.target.value })} /></div>
              </div>
              <div className="space-y-2"><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
              <Button type="submit" className="w-full">{editQuote ? "Update Quotation" : "Create Quotation"}</Button>
            </form>
          </DialogContent>
        </Dialog>
      } />

      {/* Filters */}
      <div className="flex gap-3 mb-4 flex-wrap items-center">
        <Input placeholder="Search quotes..." className="max-w-xs" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {["draft", "sent", "accepted", "rejected", "expired"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground ml-auto">{filtered.length} quotations</span>
        <Button size="sm" variant="outline" onClick={() => exportToCsv(filtered.map(q => ({
          quote_number: q.quote_number, customer: q.customers?.company_name || "", route: q.origin && q.destination ? `${q.origin} → ${q.destination}` : "",
          type: q.shipment_type || "", carrier_cost: q.carrier_cost || 0, selling_price: q.selling_price || 0,
          margin: q.margin || 0, status: q.status,
        })), "quotations")}>
          <Download className="h-4 w-4 mr-1" />CSV
        </Button>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Quote #</TableHead><TableHead>Customer</TableHead><TableHead>Route</TableHead>
              <TableHead>Type</TableHead><TableHead>Carrier Cost</TableHead><TableHead>Selling Price</TableHead>
              <TableHead>Margin</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No quotations found</TableCell></TableRow>
            ) : (
              filtered.map(q => (
                <TableRow key={q.id} className="animate-fade-in">
                  <TableCell className="font-mono font-medium">{q.quote_number}</TableCell>
                  <TableCell>{q.customers?.company_name}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{q.origin && q.destination ? `${q.origin} → ${q.destination}` : "—"}</TableCell>
                  <TableCell className="uppercase text-xs font-medium">{q.shipment_type || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{q.carrier_cost ? `$${Number(q.carrier_cost).toLocaleString()}` : "—"}</TableCell>
                  <TableCell className="font-medium">{q.selling_price ? `$${Number(q.selling_price).toLocaleString()}` : "—"}</TableCell>
                  <TableCell className={`font-medium ${(q.margin || 0) >= 0 ? "text-success" : "text-destructive"}`}>
                    {q.margin != null ? `$${Number(q.margin).toLocaleString()}` : "—"}
                  </TableCell>
                  <TableCell>
                    <Select value={q.status} onValueChange={v => updateStatus(q.id, v)}>
                      <SelectTrigger className="w-32 h-8"><StatusBadge status={q.status} /></SelectTrigger>
                      <SelectContent>{["draft", "sent", "accepted", "rejected", "expired"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {q.status === "accepted" && (
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-primary" onClick={() => createShipmentFromQuote(q)} title="Create Shipment">
                          <Ship className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => exportPDF(q)} title="Export">
                        <FileDown className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(q)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => deleteQuote(q.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
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
