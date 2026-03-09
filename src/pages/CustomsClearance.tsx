import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import AppLayout from "@/components/AppLayout";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import StatusBadge from "@/components/StatusBadge";
import { Plus, FileCheck, Eye, Shield, AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

type CustomsDeclaration = {
  id: string;
  shipment_id: string;
  declaration_number: string | null;
  declaration_type: string;
  customs_broker: string | null;
  broker_contact: string | null;
  status: string;
  hs_code: string | null;
  declared_value: number | null;
  currency: string;
  duties_amount: number | null;
  taxes_amount: number | null;
  regulatory_checks: any[];
  submitted_at: string | null;
  cleared_at: string | null;
  notes: string | null;
  created_at: string;
  shipments?: { shipment_number: string; origin: string | null; destination: string | null; customers: { company_name: string } | null } | null;
};

const STATUSES = ["pending", "submitted", "under_review", "approved", "rejected", "released"] as const;
const TYPES = ["import", "export", "transit"] as const;

const SFDA_CHECKLIST = [
  { key: "sfda_registration", label: "SFDA Product Registration" },
  { key: "sfda_import_license", label: "SFDA Import License" },
  { key: "health_certificate", label: "Health Certificate" },
  { key: "lab_analysis", label: "Lab Analysis Report" },
  { key: "halal_certificate", label: "Halal Certificate" },
];

const FASAH_CHECKLIST = [
  { key: "fasah_declaration", label: "FASAH Import Declaration" },
  { key: "commercial_invoice", label: "Commercial Invoice Uploaded" },
  { key: "bill_of_lading", label: "Bill of Lading Attached" },
  { key: "certificate_of_origin", label: "Certificate of Origin" },
  { key: "packing_list", label: "Packing List" },
  { key: "customs_tariff", label: "Customs Tariff Classification" },
];

const statusColor: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  submitted: "bg-info/10 text-info",
  under_review: "bg-warning/10 text-warning",
  approved: "bg-success/10 text-success",
  rejected: "bg-destructive/10 text-destructive",
  released: "bg-accent/10 text-accent",
};

export default function CustomsClearance() {
  const { user } = useAuth();
  const [declarations, setDeclarations] = useState<CustomsDeclaration[]>([]);
  const [shipments, setShipments] = useState<{ id: string; shipment_number: string }[]>([]);
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<CustomsDeclaration | null>(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  const [form, setForm] = useState({
    shipment_id: "", declaration_number: "", declaration_type: "import",
    customs_broker: "", broker_contact: "", hs_code: "",
    declared_value: "", currency: "SAR", notes: "",
  });

  const load = async () => {
    const [decl, ships] = await Promise.all([
      supabase.from("customs_declarations").select("*, shipments(shipment_number, origin, destination, customers(company_name))").order("created_at", { ascending: false }),
      supabase.from("shipments").select("id, shipment_number").order("created_at", { ascending: false }),
    ]);
    setDeclarations((decl.data as any) || []);
    setShipments(ships.data || []);
  };

  useEffect(() => { load(); }, []);

  const filtered = declarations.filter(d => {
    if (filterStatus !== "all" && d.status !== filterStatus) return false;
    if (filterType !== "all" && d.declaration_type !== filterType) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return (d.declaration_number?.toLowerCase().includes(q) ||
        (d.shipments as any)?.shipment_number?.toLowerCase().includes(q) ||
        d.customs_broker?.toLowerCase().includes(q));
    }
    return true;
  });

  const handleCreate = async () => {
    if (!form.shipment_id) { toast.error("Shipment is required"); return; }
    const { error } = await supabase.from("customs_declarations").insert({
      shipment_id: form.shipment_id,
      declaration_number: form.declaration_number || null,
      declaration_type: form.declaration_type as any,
      customs_broker: form.customs_broker || null,
      broker_contact: form.broker_contact || null,
      hs_code: form.hs_code || null,
      declared_value: form.declared_value ? Number(form.declared_value) : 0,
      currency: form.currency,
      notes: form.notes || null,
      created_by: user?.id,
      regulatory_checks: [],
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Declaration created");
    setOpen(false);
    setForm({ shipment_id: "", declaration_number: "", declaration_type: "import", customs_broker: "", broker_contact: "", hs_code: "", declared_value: "", currency: "SAR", notes: "" });
    load();
  };

  const updateStatus = async (id: string, status: string) => {
    const updates: any = { status };
    if (status === "submitted") updates.submitted_at = new Date().toISOString();
    if (status === "released") updates.cleared_at = new Date().toISOString();
    const { error } = await supabase.from("customs_declarations").update(updates).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Status updated");
    load();
    if (detail?.id === id) {
      setDetail({ ...detail, ...updates });
    }
  };

  const toggleCheck = async (declId: string, checkKey: string, currentChecks: any[]) => {
    const exists = currentChecks.some((c: any) => c.key === checkKey);
    let updated: any[];
    if (exists) {
      updated = currentChecks.filter((c: any) => c.key !== checkKey);
    } else {
      updated = [...currentChecks, { key: checkKey, checked_at: new Date().toISOString(), checked_by: user?.id }];
    }
    const { error } = await supabase.from("customs_declarations").update({ regulatory_checks: updated }).eq("id", declId);
    if (error) { toast.error(error.message); return; }
    load();
    if (detail?.id === declId) setDetail({ ...detail, regulatory_checks: updated });
  };

  const updateFinancials = async (id: string, duties: number, taxes: number) => {
    const { error } = await supabase.from("customs_declarations").update({ duties_amount: duties, taxes_amount: taxes }).eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Updated"); load(); }
  };

  // Stats
  const stats = {
    total: declarations.length,
    pending: declarations.filter(d => d.status === "pending").length,
    inProgress: declarations.filter(d => ["submitted", "under_review"].includes(d.status)).length,
    cleared: declarations.filter(d => d.status === "released").length,
    totalDuties: declarations.reduce((s, d) => s + Number(d.duties_amount || 0), 0),
  };

  // Detail view
  if (detail) {
    const checks = Array.isArray(detail.regulatory_checks) ? detail.regulatory_checks : [];
    const checkedKeys = new Set(checks.map((c: any) => c.key));
    const allChecks = [...SFDA_CHECKLIST, ...FASAH_CHECKLIST];
    const completedCount = allChecks.filter(c => checkedKeys.has(c.key)).length;

    return (
      <AppLayout>
        <div className="flex items-center gap-2 mb-4">
          <Button variant="ghost" onClick={() => setDetail(null)}>← Back</Button>
          <PageHeader title={detail.declaration_number || "New Declaration"} description={`${(detail.shipments as any)?.shipment_number || ""} — ${detail.declaration_type.toUpperCase()}`} />
        </div>

        <div className="grid gap-4 lg:grid-cols-4 mb-6">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Status</CardTitle></CardHeader>
            <CardContent>
              <Select value={detail.status} onValueChange={(v) => updateStatus(detail.id, v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
              </Select>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Declared Value</CardTitle></CardHeader>
            <CardContent><span className="text-lg font-display font-bold">{detail.currency} {Number(detail.declared_value || 0).toLocaleString()}</span></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Duties & Taxes</CardTitle></CardHeader>
            <CardContent>
              <span className="text-lg font-display font-bold text-warning">
                {detail.currency} {(Number(detail.duties_amount || 0) + Number(detail.taxes_amount || 0)).toLocaleString()}
              </span>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Compliance</CardTitle></CardHeader>
            <CardContent>
              <span className={`text-lg font-display font-bold ${completedCount === allChecks.length ? "text-success" : "text-warning"}`}>
                {completedCount}/{allChecks.length}
              </span>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="checklist" className="space-y-4">
          <TabsList>
            <TabsTrigger value="checklist">Regulatory Checklist</TabsTrigger>
            <TabsTrigger value="financials">Duties & Taxes</TabsTrigger>
            <TabsTrigger value="info">Details</TabsTrigger>
          </TabsList>

          <TabsContent value="checklist" className="space-y-6">
            <Card>
              <CardHeader><CardTitle className="font-display flex items-center gap-2"><Shield className="h-4 w-4" /> SFDA Compliance</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {SFDA_CHECKLIST.map(item => {
                  const checked = checkedKeys.has(item.key);
                  return (
                    <div key={item.key} className={`flex items-center gap-3 rounded-lg border p-3 ${checked ? "bg-success/5 border-success/20" : ""}`}>
                      <Checkbox checked={checked} onCheckedChange={() => toggleCheck(detail.id, item.key, checks)} />
                      <span className={`text-sm ${checked ? "text-success font-medium" : ""}`}>{item.label}</span>
                      {checked && <CheckCircle2 className="h-4 w-4 text-success ml-auto" />}
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="font-display flex items-center gap-2"><FileCheck className="h-4 w-4" /> FASAH Requirements</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {FASAH_CHECKLIST.map(item => {
                  const checked = checkedKeys.has(item.key);
                  return (
                    <div key={item.key} className={`flex items-center gap-3 rounded-lg border p-3 ${checked ? "bg-success/5 border-success/20" : ""}`}>
                      <Checkbox checked={checked} onCheckedChange={() => toggleCheck(detail.id, item.key, checks)} />
                      <span className={`text-sm ${checked ? "text-success font-medium" : ""}`}>{item.label}</span>
                      {checked && <CheckCircle2 className="h-4 w-4 text-success ml-auto" />}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="financials">
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Duties Amount ({detail.currency})</Label>
                    <Input type="number" defaultValue={detail.duties_amount || 0}
                      onBlur={(e) => updateFinancials(detail.id, Number(e.target.value), Number(detail.taxes_amount || 0))} />
                  </div>
                  <div>
                    <Label>Taxes Amount ({detail.currency})</Label>
                    <Input type="number" defaultValue={detail.taxes_amount || 0}
                      onBlur={(e) => updateFinancials(detail.id, Number(detail.duties_amount || 0), Number(e.target.value))} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="info">
            <Card>
              <CardContent className="pt-6">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><span className="text-muted-foreground">Broker:</span> {detail.customs_broker || "—"}</div>
                  <div><span className="text-muted-foreground">Broker Contact:</span> {detail.broker_contact || "—"}</div>
                  <div><span className="text-muted-foreground">HS Code:</span> {detail.hs_code || "—"}</div>
                  <div><span className="text-muted-foreground">Type:</span> {detail.declaration_type.toUpperCase()}</div>
                  <div><span className="text-muted-foreground">Submitted:</span> {detail.submitted_at ? new Date(detail.submitted_at).toLocaleString() : "—"}</div>
                  <div><span className="text-muted-foreground">Cleared:</span> {detail.cleared_at ? new Date(detail.cleared_at).toLocaleString() : "—"}</div>
                </div>
                {detail.notes && <p className="mt-4 text-sm text-muted-foreground">{detail.notes}</p>}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </AppLayout>
    );
  }

  // List view
  return (
    <AppLayout>
      <PageHeader title="Customs Clearance" description="Track declarations, SFDA & FASAH compliance" action={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />New Declaration</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Create Customs Declaration</DialogTitle></DialogHeader>
            <div className="grid gap-3">
              <div>
                <Label>Shipment *</Label>
                <Select value={form.shipment_id} onValueChange={v => setForm({ ...form, shipment_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select shipment" /></SelectTrigger>
                  <SelectContent>{shipments.map(s => <SelectItem key={s.id} value={s.id}>{s.shipment_number}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Declaration #</Label><Input value={form.declaration_number} onChange={e => setForm({ ...form, declaration_number: e.target.value })} /></div>
                <div>
                  <Label>Type</Label>
                  <Select value={form.declaration_type} onValueChange={v => setForm({ ...form, declaration_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{TYPES.map(t => <SelectItem key={t} value={t}>{t.toUpperCase()}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Customs Broker</Label><Input value={form.customs_broker} onChange={e => setForm({ ...form, customs_broker: e.target.value })} /></div>
                <div><Label>Broker Contact</Label><Input value={form.broker_contact} onChange={e => setForm({ ...form, broker_contact: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label>HS Code</Label><Input value={form.hs_code} onChange={e => setForm({ ...form, hs_code: e.target.value })} /></div>
                <div><Label>Declared Value</Label><Input type="number" value={form.declared_value} onChange={e => setForm({ ...form, declared_value: e.target.value })} /></div>
                <div>
                  <Label>Currency</Label>
                  <Select value={form.currency} onValueChange={v => setForm({ ...form, currency: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SAR">SAR</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
              <Button onClick={handleCreate}>Create Declaration</Button>
            </div>
          </DialogContent>
        </Dialog>
      } />

      {/* Stats */}
      <div className="grid gap-3 md:grid-cols-4 mb-4">
        <Card><CardContent className="py-3 px-4"><p className="text-xs text-muted-foreground">Total</p><p className="text-2xl font-display font-bold">{stats.total}</p></CardContent></Card>
        <Card><CardContent className="py-3 px-4"><p className="text-xs text-muted-foreground">Pending</p><p className="text-2xl font-display font-bold text-warning">{stats.pending}</p></CardContent></Card>
        <Card><CardContent className="py-3 px-4"><p className="text-xs text-muted-foreground">In Progress</p><p className="text-2xl font-display font-bold text-info">{stats.inProgress}</p></CardContent></Card>
        <Card><CardContent className="py-3 px-4"><p className="text-xs text-muted-foreground">Cleared</p><p className="text-2xl font-display font-bold text-success">{stats.cleared}</p></CardContent></Card>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4 flex-wrap items-center">
        <Input placeholder="Search declarations..." className="max-w-xs" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {STATUSES.map(s => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-32"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {TYPES.map(t => <SelectItem key={t} value={t}>{t.toUpperCase()}</SelectItem>)}
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground ml-auto">{filtered.length} declarations</span>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Declaration #</TableHead>
                <TableHead>Shipment</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Broker</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Duties</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(d => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium font-display">{d.declaration_number || "—"}</TableCell>
                  <TableCell>{(d.shipments as any)?.shipment_number || "—"}</TableCell>
                  <TableCell><span className="uppercase text-xs font-bold">{d.declaration_type}</span></TableCell>
                  <TableCell>{d.customs_broker || "—"}</TableCell>
                  <TableCell>{d.currency} {Number(d.declared_value || 0).toLocaleString()}</TableCell>
                  <TableCell className="text-warning">{d.currency} {Number(d.duties_amount || 0).toLocaleString()}</TableCell>
                  <TableCell><span className={`status-badge ${statusColor[d.status]}`}>{d.status.replace(/_/g, " ")}</span></TableCell>
                  <TableCell>
                    <Button size="sm" variant="ghost" onClick={() => setDetail(d)}><Eye className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No declarations found</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AppLayout>
  );
}