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
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, DollarSign, Ship, TrendingUp, Users, Phone, Mail, Calendar, FileText, CheckSquare, Download, Upload } from "lucide-react";
import { exportToCsv, exportToExcel, handleFileImport } from "@/lib/csvUtils";
import { downloadCustomersTemplate } from "@/lib/importTemplates";

type Customer = {
  id: string; company_name: string; tax_id: string | null; city: string | null;
  country: string | null; customer_type: string; status: string; industry: string | null;
  notes: string | null; created_at: string;
};

type Contact = { id: string; name: string; email: string | null; phone: string | null; position: string | null; is_primary: boolean; };
type Opportunity = { id: string; title: string; stage: string; estimated_value: number | null; };

type CustomerMetrics = {
  customer_id: string; shipment_count: number; total_revenue: number; total_profit: number;
};

type TimelineEvent = {
  id: string; type: "shipment" | "quotation" | "activity" | "task"; title: string;
  subtitle: string; date: string; status: string;
};

const INDUSTRIES = ["Pharma", "Energy", "Retail", "E-commerce", "Government", "Automotive", "FMCG", "Technology", "Manufacturing", "Other"];

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [metrics, setMetrics] = useState<Map<string, CustomerMetrics>>(new Map());
  const [open, setOpen] = useState(false);
  const [editCust, setEditCust] = useState<Customer | null>(null);
  const [detailCust, setDetailCust] = useState<Customer | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [form, setForm] = useState({ company_name: "", tax_id: "", city: "", country: "", customer_type: "shipper", industry: "", notes: "" });

  // Filters
  const [filterIndustry, setFilterIndustry] = useState("all");
  const [filterSegment, setFilterSegment] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  const load = async () => {
    const [custRes, shipRes] = await Promise.all([
      supabase.from("customers").select("*").order("created_at", { ascending: false }),
      supabase.from("shipments").select("customer_id, total_revenue, profit, status"),
    ]);
    if (custRes.data) setCustomers(custRes.data as any);

    // Build metrics
    const m = new Map<string, CustomerMetrics>();
    (shipRes.data || []).forEach((s: any) => {
      if (!m.has(s.customer_id)) m.set(s.customer_id, { customer_id: s.customer_id, shipment_count: 0, total_revenue: 0, total_profit: 0 });
      const met = m.get(s.customer_id)!;
      met.shipment_count++;
      met.total_revenue += Number(s.total_revenue || 0);
      met.total_profit += Number(s.profit || 0);
    });
    setMetrics(m);
  };

  useEffect(() => { load(); }, []);

  // Segmentation
  const getSegment = (id: string) => {
    const m = metrics.get(id);
    if (!m) return "New";
    if (m.total_revenue > 50000 && m.shipment_count > 10) return "Enterprise";
    if (m.total_revenue > 10000) return "Growth";
    if (m.shipment_count > 0) return "Active";
    return "New";
  };

  const segmentColor: Record<string, string> = {
    Enterprise: "bg-success/10 text-success",
    Growth: "bg-info/10 text-info",
    Active: "bg-warning/10 text-warning",
    New: "bg-muted text-muted-foreground",
  };

  const filtered = useMemo(() => {
    let result = customers;
    if (filterIndustry !== "all") result = result.filter(c => c.industry === filterIndustry);
    if (filterSegment !== "all") result = result.filter(c => getSegment(c.id) === filterSegment);
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      result = result.filter(c => c.company_name.toLowerCase().includes(q) || c.country?.toLowerCase().includes(q));
    }
    return result;
  }, [customers, filterIndustry, filterSegment, searchTerm, metrics]);

  // Segmentation stats
  const segmentStats = useMemo(() => {
    const stats: Record<string, number> = { Enterprise: 0, Growth: 0, Active: 0, New: 0 };
    customers.forEach(c => { stats[getSegment(c.id)]++; });
    return stats;
  }, [customers, metrics]);

  const loadDetail = async (cust: Customer) => {
    setDetailCust(cust);
    const [contRes, oppRes, shipRes, quotRes, actRes, taskRes] = await Promise.all([
      supabase.from("contacts").select("*").eq("customer_id", cust.id).order("is_primary", { ascending: false }),
      supabase.from("opportunities").select("id, title, stage, estimated_value").eq("customer_id", cust.id).order("created_at", { ascending: false }),
      supabase.from("shipments").select("id, shipment_number, status, created_at, origin, destination").eq("customer_id", cust.id).order("created_at", { ascending: false }),
      supabase.from("quotations").select("id, quote_number, status, created_at, total_amount").eq("customer_id", cust.id).order("created_at", { ascending: false }),
      supabase.from("activities").select("id, activity_type, notes, activity_date").eq("customer_id", cust.id).order("activity_date", { ascending: false }),
      supabase.from("tasks").select("id, description, status, due_date, created_at").eq("customer_id", cust.id).order("created_at", { ascending: false }),
    ]);
    setContacts((contRes.data as any) || []);
    setOpportunities((oppRes.data as any) || []);

    // Build unified timeline
    const events: TimelineEvent[] = [];
    (shipRes.data || []).forEach((s: any) => events.push({ id: s.id, type: "shipment", title: s.shipment_number, subtitle: `${s.origin || "—"} → ${s.destination || "—"}`, date: s.created_at, status: s.status }));
    (quotRes.data || []).forEach((q: any) => events.push({ id: q.id, type: "quotation", title: q.quote_number, subtitle: q.total_amount ? `$${Number(q.total_amount).toLocaleString()}` : "—", date: q.created_at, status: q.status }));
    (actRes.data || []).forEach((a: any) => events.push({ id: a.id, type: "activity", title: a.activity_type, subtitle: a.notes || "", date: a.activity_date, status: a.activity_type }));
    (taskRes.data || []).forEach((t: any) => events.push({ id: t.id, type: "task", title: t.description, subtitle: "", date: t.created_at, status: t.status }));
    events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setTimeline(events);
  };

  const resetForm = () => setForm({ company_name: "", tax_id: "", city: "", country: "", customer_type: "shipper", industry: "", notes: "" });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { company_name: form.company_name, tax_id: form.tax_id || null, city: form.city || null, country: form.country || null, customer_type: form.customer_type as any, industry: form.industry || null, notes: form.notes || null };
    const { error } = editCust ? await supabase.from("customers").update(payload).eq("id", editCust.id) : await supabase.from("customers").insert(payload);
    if (error) toast.error(error.message);
    else { toast.success(editCust ? "Customer updated" : "Customer created"); setOpen(false); setEditCust(null); resetForm(); load(); }
  };

  const deleteCust = async (id: string) => {
    const { error } = await supabase.from("customers").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Customer deleted"); load(); }
  };

  const openEdit = (c: Customer) => {
    setEditCust(c);
    setForm({ company_name: c.company_name, tax_id: c.tax_id || "", city: c.city || "", country: c.country || "", customer_type: c.customer_type, industry: c.industry || "", notes: c.notes || "" });
    setOpen(true);
  };

  const typeIcon = (type: string) => {
    if (type === "shipment") return <Ship className="h-3.5 w-3.5" />;
    if (type === "quotation") return <FileText className="h-3.5 w-3.5" />;
    if (type === "activity") return <Calendar className="h-3.5 w-3.5" />;
    return <CheckSquare className="h-3.5 w-3.5" />;
  };

  return (
    <AppLayout>
      <PageHeader title="Customers" description="Your client base" action={
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditCust(null); resetForm(); } }}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />Add Customer</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle className="font-display">{editCust ? "Edit Customer" : "New Customer"}</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2"><Label>Company Name *</Label><Input value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} required /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Tax ID</Label><Input value={form.tax_id} onChange={(e) => setForm({ ...form, tax_id: e.target.value })} /></div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={form.customer_type} onValueChange={(v) => setForm({ ...form, customer_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="shipper">Shipper</SelectItem>
                      <SelectItem value="consignee">Consignee</SelectItem>
                      <SelectItem value="both">Both</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>City</Label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
                <div className="space-y-2"><Label>Country</Label><Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} /></div>
                <div className="space-y-2">
                  <Label>Industry</Label>
                  <Select value={form.industry} onValueChange={(v) => setForm({ ...form, industry: v })}>
                    <SelectTrigger><SelectValue placeholder="Select industry" /></SelectTrigger>
                    <SelectContent>{INDUSTRIES.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2"><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
              <Button type="submit" className="w-full">{editCust ? "Update Customer" : "Create Customer"}</Button>
            </form>
          </DialogContent>
        </Dialog>
      } />

      {/* Segmentation Cards */}
      <div className="grid gap-3 md:grid-cols-4 mb-4">
        {Object.entries(segmentStats).map(([seg, count]) => (
          <Card key={seg} className={`cursor-pointer transition-all ${filterSegment === seg ? "ring-2 ring-primary" : ""}`} onClick={() => setFilterSegment(filterSegment === seg ? "all" : seg)}>
            <CardContent className="py-3 px-4 flex items-center justify-between">
              <div>
                <span className={`status-badge ${segmentColor[seg]}`}>{seg}</span>
                <p className="text-2xl font-display font-bold mt-1">{count}</p>
              </div>
              <Users className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4 flex-wrap items-center">
        <Input placeholder="Search customers..." className="max-w-xs" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        <Select value={filterIndustry} onValueChange={setFilterIndustry}>
          <SelectTrigger className="w-40"><SelectValue placeholder="All Industries" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Industries</SelectItem>
            {INDUSTRIES.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground ml-auto">{filtered.length} customers</span>
        <Button size="sm" variant="outline" onClick={() => handleFileImport(
          (rows) => {
            const valid: any[] = [];
            const errors: string[] = [];
            rows.forEach((row, i) => {
              const name = (row["Company Name"] || row["company_name"] || "").trim();
              if (!name) { errors.push(`Row ${i + 2}: missing company name`); return; }
              valid.push({
                company_name: name,
                city: row["City"] || row["city"] || null,
                country: row["Country"] || row["country"] || null,
                industry: row["Industry"] || row["industry"] || null,
                notes: row["Notes"] || row["notes"] || null,
                _contact_name: (row["Contact Person"] || row["contact_person"] || "").trim(),
                _contact_phone: (row["Phone"] || row["phone"] || "").trim(),
                _contact_email: (row["Email"] || row["email"] || "").trim(),
              });
            });
            return { valid, errors };
          },
          async (data) => {
            const customerRows = data.map(({ _contact_name, _contact_phone, _contact_email, ...rest }: any) => rest);
            const { data: inserted, error } = await supabase.from("customers").insert(customerRows).select("id");
            if (error) throw error;
            // Auto-create contacts for rows that have contact info
            const contactRows: any[] = [];
            if (inserted) {
              data.forEach((row: any, i: number) => {
                if (row._contact_name && inserted[i]) {
                  contactRows.push({
                    customer_id: inserted[i].id,
                    name: row._contact_name,
                    phone: row._contact_phone || null,
                    email: row._contact_email || null,
                    is_primary: true,
                  });
                }
              });
            }
            if (contactRows.length > 0) {
              await supabase.from("contacts").insert(contactRows);
            }
            load();
          }
        )}>
          <Upload className="h-4 w-4 mr-1" />Import
        </Button>
        <Button size="sm" variant="outline" onClick={() => exportToCsv(filtered.map(c => {
          const m = metrics.get(c.id);
          return {
            company: c.company_name, type: c.customer_type, industry: c.industry || "", city: c.city || "",
            country: c.country || "", segment: getSegment(c.id), status: c.status,
            shipments: m?.shipment_count || 0, revenue: m?.total_revenue || 0, profit: m?.total_profit || 0,
          };
        }), "customers")}>
          <Download className="h-4 w-4 mr-1" />CSV
        </Button>
        <Button size="sm" variant="outline" onClick={() => exportToExcel(filtered.map(c => {
          const m = metrics.get(c.id);
          return {
            company: c.company_name, type: c.customer_type, industry: c.industry || "", city: c.city || "",
            country: c.country || "", segment: getSegment(c.id), status: c.status,
            shipments: m?.shipment_count || 0, revenue: m?.total_revenue || 0, profit: m?.total_profit || 0,
          };
        }), "customers")}>
          <Download className="h-4 w-4 mr-1" />Excel
        </Button>
        <Button size="sm" variant="ghost" onClick={downloadCustomersTemplate}>
          Template
        </Button>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Company</TableHead><TableHead>Segment</TableHead><TableHead>Type</TableHead>
              <TableHead>Industry</TableHead><TableHead>Shipments</TableHead><TableHead>Revenue</TableHead>
              <TableHead>Profit</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No customers found</TableCell></TableRow>
            ) : (
              filtered.map((c) => {
                const m = metrics.get(c.id);
                const seg = getSegment(c.id);
                return (
                  <TableRow key={c.id} className="cursor-pointer" onClick={() => loadDetail(c)}>
                    <TableCell className="font-medium">{c.company_name}</TableCell>
                    <TableCell><span className={`status-badge ${segmentColor[seg]}`}>{seg}</span></TableCell>
                    <TableCell className="capitalize">{c.customer_type}</TableCell>
                    <TableCell className="text-muted-foreground">{c.industry || "—"}</TableCell>
                    <TableCell>{m?.shipment_count || 0}</TableCell>
                    <TableCell className="font-medium">${(m?.total_revenue || 0).toLocaleString()}</TableCell>
                    <TableCell className={`font-medium ${(m?.total_profit || 0) >= 0 ? "text-success" : "text-destructive"}`}>
                      ${(m?.total_profit || 0).toLocaleString()}
                    </TableCell>
                    <TableCell><StatusBadge status={c.status} /></TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(c)}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => deleteCust(c.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!detailCust} onOpenChange={(v) => { if (!v) setDetailCust(null); }}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-display">{detailCust?.company_name}</DialogTitle></DialogHeader>
          {detailCust && (
            <>
              <div className="grid grid-cols-3 gap-3 text-sm mb-2">
                <div><span className="text-muted-foreground">Type:</span> <span className="capitalize">{detailCust.customer_type}</span></div>
                <div><span className="text-muted-foreground">Industry:</span> {detailCust.industry || "—"}</div>
                <div><span className="text-muted-foreground">Country:</span> {detailCust.country || "—"}</div>
                <div><span className="text-muted-foreground">City:</span> {detailCust.city || "—"}</div>
                <div><span className="text-muted-foreground">Segment:</span> <span className={`status-badge ${segmentColor[getSegment(detailCust.id)]}`}>{getSegment(detailCust.id)}</span></div>
                <div><span className="text-muted-foreground">Status:</span> <StatusBadge status={detailCust.status} /></div>
              </div>

              {/* Metrics row */}
              {metrics.get(detailCust.id) && (
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <Card>
                    <CardContent className="py-2 px-3 flex items-center gap-2">
                      <Ship className="h-4 w-4 text-muted-foreground" />
                      <div><p className="text-xs text-muted-foreground">Shipments</p><p className="font-display font-bold">{metrics.get(detailCust.id)!.shipment_count}</p></div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="py-2 px-3 flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <div><p className="text-xs text-muted-foreground">Revenue</p><p className="font-display font-bold">${metrics.get(detailCust.id)!.total_revenue.toLocaleString()}</p></div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="py-2 px-3 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                      <div><p className="text-xs text-muted-foreground">Profit</p><p className={`font-display font-bold ${metrics.get(detailCust.id)!.total_profit >= 0 ? "text-success" : "text-destructive"}`}>${metrics.get(detailCust.id)!.total_profit.toLocaleString()}</p></div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </>
          )}

          <Tabs defaultValue="timeline" className="w-full">
            <TabsList className="w-full">
              <TabsTrigger value="timeline" className="flex-1">Timeline ({timeline.length})</TabsTrigger>
              <TabsTrigger value="contacts" className="flex-1">Contacts ({contacts.length})</TabsTrigger>
              <TabsTrigger value="opportunities" className="flex-1">Opportunities ({opportunities.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="timeline">
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {timeline.map(e => (
                  <div key={`${e.type}-${e.id}`} className="flex items-start gap-3 rounded-lg border p-3 text-sm">
                    <div className="mt-0.5 text-muted-foreground">{typeIcon(e.type)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground">{e.type}</span>
                        <span className="font-medium truncate">{e.title}</span>
                      </div>
                      {e.subtitle && <p className="text-muted-foreground text-xs truncate">{e.subtitle}</p>}
                    </div>
                    <div className="text-right shrink-0">
                      <StatusBadge status={e.status} />
                      <p className="text-[10px] text-muted-foreground mt-1">{new Date(e.date).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
                {timeline.length === 0 && <p className="text-center text-sm text-muted-foreground py-4">No activity yet</p>}
              </div>
            </TabsContent>

            <TabsContent value="contacts">
              <div className="space-y-2">
                {contacts.map(c => (
                  <div key={c.id} className="flex items-center gap-3 rounded-lg border p-3 text-sm">
                    <div className="flex-1">
                      <span className="font-medium">{c.name}</span>
                      {c.is_primary && <span className="ml-2 text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">Primary</span>}
                      <span className="text-muted-foreground ml-2">{c.position}</span>
                    </div>
                    <span className="text-muted-foreground text-xs">{c.email}</span>
                    <span className="text-muted-foreground text-xs">{c.phone}</span>
                  </div>
                ))}
                {contacts.length === 0 && <p className="text-center text-sm text-muted-foreground py-4">No contacts linked</p>}
              </div>
            </TabsContent>

            <TabsContent value="opportunities">
              <div className="space-y-2">
                {opportunities.map(o => (
                  <div key={o.id} className="flex items-center gap-3 rounded-lg border p-3 text-sm">
                    <span className="font-medium flex-1">{o.title}</span>
                    <StatusBadge status={o.stage} />
                    <span className="text-sm font-medium">{o.estimated_value ? `$${Number(o.estimated_value).toLocaleString()}` : "—"}</span>
                  </div>
                ))}
                {opportunities.length === 0 && <p className="text-center text-sm text-muted-foreground py-4">No opportunities linked</p>}
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
