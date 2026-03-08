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
import StatusBadge from "@/components/StatusBadge";
import { Plus, Ship, Eye, Package, MapPin, AlertTriangle, DollarSign } from "lucide-react";
import { toast } from "sonner";

type Shipment = {
  id: string; shipment_number: string; customer_id: string; mode: string; origin: string | null;
  destination: string | null; carrier: string | null; etd: string | null; eta: string | null;
  status: string; assigned_to: string | null; agent_id: string | null; notes: string | null;
  total_cost: number | null; total_revenue: number | null; profit: number | null;
  created_at: string;
  customers?: { company_name: string } | null;
  agents?: { agent_name: string } | null;
};

const MODES = ["fcl", "lcl", "air", "land", "multimodal"] as const;
const STATUSES = ["booked", "in_transit", "at_port", "customs", "delivered", "cancelled"] as const;

const MILESTONES = [
  { key: "booking_confirmed", label: "Booked" },
  { key: "cargo_received", label: "Cargo Received" },
  { key: "loaded_on_vessel", label: "Loaded" },
  { key: "departed_origin", label: "Departed" },
  { key: "in_transit", label: "In Transit" },
  { key: "arrived_destination", label: "Arrived" },
  { key: "customs_clearance", label: "Customs" },
  { key: "out_for_delivery", label: "Out for Delivery" },
  { key: "delivered", label: "Delivered" },
];

export default function Shipments() {
  const { user } = useAuth();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [filtered, setFiltered] = useState<Shipment[]>([]);
  const [customers, setCustomers] = useState<{ id: string; company_name: string }[]>([]);
  const [agents, setAgents] = useState<{ id: string; agent_name: string }[]>([]);
  const [profiles, setProfiles] = useState<{ id: string; full_name: string }[]>([]);
  const [open, setOpen] = useState(false);
  const [detailShipment, setDetailShipment] = useState<Shipment | null>(null);
  const [trackingEvents, setTrackingEvents] = useState<any[]>([]);
  const [containers, setContainers] = useState<any[]>([]);

  // Filters
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterMode, setFilterMode] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  const [form, setForm] = useState({
    customer_id: "", mode: "fcl" as string, origin: "", destination: "",
    carrier: "", etd: "", eta: "", status: "booked" as string,
    assigned_to: "", agent_id: "", notes: "", total_cost: "", total_revenue: "",
  });

  const load = async () => {
    const [s, c, a, p] = await Promise.all([
      supabase.from("shipments").select("*, customers(company_name), agents(agent_name)").order("created_at", { ascending: false }),
      supabase.from("customers").select("id, company_name").order("company_name"),
      supabase.from("agents").select("id, agent_name").order("agent_name"),
      supabase.from("profiles").select("id, full_name"),
    ]);
    setShipments((s.data as any) || []);
    setCustomers(c.data || []);
    setAgents(a.data || []);
    setProfiles(p.data || []);
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    let result = shipments;
    if (filterStatus !== "all") result = result.filter(s => s.status === filterStatus);
    if (filterMode !== "all") result = result.filter(s => s.mode === filterMode);
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      result = result.filter(s =>
        s.shipment_number.toLowerCase().includes(q) ||
        s.customers?.company_name?.toLowerCase().includes(q) ||
        s.origin?.toLowerCase().includes(q) ||
        s.destination?.toLowerCase().includes(q)
      );
    }
    setFiltered(result);
  }, [shipments, filterStatus, filterMode, searchTerm]);

  const loadDetail = async (shipment: Shipment) => {
    setDetailShipment(shipment);
    const [te, ct] = await Promise.all([
      supabase.from("tracking_events").select("*").eq("shipment_id", shipment.id).order("event_date"),
      supabase.from("containers").select("*").eq("shipment_id", shipment.id),
    ]);
    setTrackingEvents(te.data || []);
    setContainers(ct.data || []);
  };

  const handleCreate = async () => {
    if (!form.customer_id) { toast.error("Customer is required"); return; }
    const cost = form.total_cost ? Number(form.total_cost) : 0;
    const rev = form.total_revenue ? Number(form.total_revenue) : 0;
    const { error } = await supabase.from("shipments").insert({
      customer_id: form.customer_id, mode: form.mode as any,
      origin: form.origin || null, destination: form.destination || null,
      carrier: form.carrier || null, etd: form.etd || null, eta: form.eta || null,
      status: form.status as any, assigned_to: form.assigned_to || null,
      agent_id: form.agent_id || null, notes: form.notes || null,
      total_cost: cost, total_revenue: rev, profit: rev - cost,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Shipment created");
    setOpen(false);
    setForm({ customer_id: "", mode: "fcl", origin: "", destination: "", carrier: "", etd: "", eta: "", status: "booked", assigned_to: "", agent_id: "", notes: "", total_cost: "", total_revenue: "" });
    load();
  };

  const updateStatus = async (id: string, status: string) => {
    await supabase.from("shipments").update({ status: status as any }).eq("id", id);
    load();
    if (detailShipment?.id === id) setDetailShipment({ ...detailShipment, status: status as any });
  };

  const [newMilestone, setNewMilestone] = useState({ milestone: "booking_confirmed", location: "", notes: "" });
  const addTrackingEvent = async () => {
    if (!detailShipment) return;
    const { error } = await supabase.from("tracking_events").insert({
      shipment_id: detailShipment.id, milestone: newMilestone.milestone as any,
      location: newMilestone.location || null, notes: newMilestone.notes || null, created_by: user?.id,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Tracking event added");
    setNewMilestone({ milestone: "booking_confirmed", location: "", notes: "" });
    loadDetail(detailShipment);
  };

  const [newContainer, setNewContainer] = useState({ container_number: "", container_type: "20ft", weight_kg: "", cbm: "", packages: "", commodity: "" });
  const addContainer = async () => {
    if (!detailShipment) return;
    const { error } = await supabase.from("containers").insert({
      shipment_id: detailShipment.id, container_number: newContainer.container_number || null,
      container_type: newContainer.container_type as any,
      weight_kg: newContainer.weight_kg ? Number(newContainer.weight_kg) : null,
      cbm: newContainer.cbm ? Number(newContainer.cbm) : null,
      packages: newContainer.packages ? Number(newContainer.packages) : null,
      commodity: newContainer.commodity || null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Container added");
    setNewContainer({ container_number: "", container_type: "20ft", weight_kg: "", cbm: "", packages: "", commodity: "" });
    loadDetail(detailShipment);
  };

  const completedMilestones = new Set(trackingEvents.map((e: any) => e.milestone));
  const now = new Date();
  const isDelayed = (s: Shipment) => s.eta && new Date(s.eta) < now && !["delivered", "cancelled"].includes(s.status);

  if (detailShipment) {
    return (
      <AppLayout>
        <div className="flex items-center gap-2 mb-4">
          <Button variant="ghost" onClick={() => setDetailShipment(null)}>← Back</Button>
          <PageHeader title={detailShipment.shipment_number} description={`${detailShipment.origin || "—"} → ${detailShipment.destination || "—"}`} />
        </div>

        <div className="grid gap-4 lg:grid-cols-4 mb-6">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Status</CardTitle></CardHeader>
            <CardContent>
              <Select value={detailShipment.status} onValueChange={(v) => updateStatus(detailShipment.id, v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
              </Select>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Mode</CardTitle></CardHeader>
            <CardContent><span className="text-lg font-display font-bold uppercase">{detailShipment.mode}</span></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Carrier</CardTitle></CardHeader>
            <CardContent><span className="text-lg font-medium">{detailShipment.carrier || "—"}</span></CardContent>
          </Card>
          <Card className={Number(detailShipment.profit) >= 0 ? "" : "border-destructive/30"}>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-1"><DollarSign className="h-3 w-3" /> Profit</CardTitle></CardHeader>
            <CardContent>
              <span className={`text-lg font-display font-bold ${Number(detailShipment.profit) >= 0 ? "text-success" : "text-destructive"}`}>
                ${Number(detailShipment.profit || 0).toLocaleString()}
              </span>
              <div className="text-xs text-muted-foreground mt-1">
                Rev: ${Number(detailShipment.total_revenue || 0).toLocaleString()} | Cost: ${Number(detailShipment.total_cost || 0).toLocaleString()}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Timeline */}
        <Card className="mb-6">
          <CardHeader><CardTitle className="font-display flex items-center gap-2"><MapPin className="h-4 w-4" /> Tracking Timeline</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center gap-1 overflow-x-auto pb-2">
              {MILESTONES.map((m, i) => {
                const done = completedMilestones.has(m.key);
                return (
                  <div key={m.key} className="flex items-center">
                    <div className="flex flex-col items-center min-w-[80px]">
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold ${done ? "bg-success text-success-foreground" : "bg-muted text-muted-foreground"}`}>
                        {i + 1}
                      </div>
                      <span className={`text-[10px] mt-1 text-center ${done ? "text-success font-medium" : "text-muted-foreground"}`}>{m.label}</span>
                    </div>
                    {i < MILESTONES.length - 1 && <div className={`h-0.5 w-6 ${done ? "bg-success" : "bg-muted"}`} />}
                  </div>
                );
              })}
            </div>

            <div className="mt-4 flex gap-2 flex-wrap items-end">
              <div>
                <Label className="text-xs">Milestone</Label>
                <Select value={newMilestone.milestone} onValueChange={v => setNewMilestone({ ...newMilestone, milestone: v })}>
                  <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                  <SelectContent>{MILESTONES.map(m => <SelectItem key={m.key} value={m.key}>{m.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Location</Label>
                <Input className="w-36" value={newMilestone.location} onChange={e => setNewMilestone({ ...newMilestone, location: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Notes</Label>
                <Input className="w-48" value={newMilestone.notes} onChange={e => setNewMilestone({ ...newMilestone, notes: e.target.value })} />
              </div>
              <Button size="sm" onClick={addTrackingEvent}>Add Event</Button>
            </div>

            {trackingEvents.length > 0 && (
              <div className="mt-4 space-y-2">
                {trackingEvents.map((e: any) => (
                  <div key={e.id} className="flex items-center gap-3 text-sm">
                    <span className="text-xs text-muted-foreground w-28">{new Date(e.event_date).toLocaleString()}</span>
                    <StatusBadge status={e.milestone.replace(/_/g, " ")} />
                    {e.location && <span className="text-muted-foreground">@ {e.location}</span>}
                    {e.notes && <span className="text-muted-foreground">— {e.notes}</span>}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Containers */}
        <Card className="mb-6">
          <CardHeader><CardTitle className="font-display flex items-center gap-2"><Package className="h-4 w-4" /> Containers ({containers.length})</CardTitle></CardHeader>
          <CardContent>
            {containers.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Number</TableHead><TableHead>Type</TableHead><TableHead>Weight (kg)</TableHead>
                    <TableHead>CBM</TableHead><TableHead>Packages</TableHead><TableHead>Commodity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {containers.map((c: any) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.container_number || "—"}</TableCell>
                      <TableCell>{c.container_type}</TableCell>
                      <TableCell>{c.weight_kg ?? "—"}</TableCell>
                      <TableCell>{c.cbm ?? "—"}</TableCell>
                      <TableCell>{c.packages ?? "—"}</TableCell>
                      <TableCell>{c.commodity || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            <div className="mt-4 flex gap-2 flex-wrap items-end">
              <div>
                <Label className="text-xs">Number</Label>
                <Input className="w-32" value={newContainer.container_number} onChange={e => setNewContainer({ ...newContainer, container_number: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Type</Label>
                <Select value={newContainer.container_type} onValueChange={v => setNewContainer({ ...newContainer, container_type: v })}>
                  <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["20ft","40ft","40hc","45ft","reefer_20","reefer_40"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Weight (kg)</Label>
                <Input type="number" className="w-24" value={newContainer.weight_kg} onChange={e => setNewContainer({ ...newContainer, weight_kg: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">CBM</Label>
                <Input type="number" className="w-20" value={newContainer.cbm} onChange={e => setNewContainer({ ...newContainer, cbm: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Packages</Label>
                <Input type="number" className="w-20" value={newContainer.packages} onChange={e => setNewContainer({ ...newContainer, packages: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Commodity</Label>
                <Input className="w-32" value={newContainer.commodity} onChange={e => setNewContainer({ ...newContainer, commodity: e.target.value })} />
              </div>
              <Button size="sm" onClick={addContainer}>Add</Button>
            </div>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader title="Shipments" description="Transport management" action={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />New Shipment</Button></DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Create Shipment</DialogTitle></DialogHeader>
            <div className="grid gap-3">
              <div>
                <Label>Customer *</Label>
                <Select value={form.customer_id} onValueChange={v => setForm({ ...form, customer_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                  <SelectContent>{customers.map(c => <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Mode</Label>
                  <Select value={form.mode} onValueChange={v => setForm({ ...form, mode: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{MODES.map(m => <SelectItem key={m} value={m}>{m.toUpperCase()}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Origin</Label><Input value={form.origin} onChange={e => setForm({ ...form, origin: e.target.value })} /></div>
                <div><Label>Destination</Label><Input value={form.destination} onChange={e => setForm({ ...form, destination: e.target.value })} /></div>
              </div>
              <div><Label>Carrier</Label><Input value={form.carrier} onChange={e => setForm({ ...form, carrier: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>ETD</Label><Input type="date" value={form.etd} onChange={e => setForm({ ...form, etd: e.target.value })} /></div>
                <div><Label>ETA</Label><Input type="date" value={form.eta} onChange={e => setForm({ ...form, eta: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Total Cost ($)</Label><Input type="number" value={form.total_cost} onChange={e => setForm({ ...form, total_cost: e.target.value })} /></div>
                <div><Label>Total Revenue ($)</Label><Input type="number" value={form.total_revenue} onChange={e => setForm({ ...form, total_revenue: e.target.value })} /></div>
              </div>
              {form.total_cost && form.total_revenue && (
                <div className="rounded-lg bg-muted p-3 text-sm">
                  <span className="text-muted-foreground">Profit:</span>{" "}
                  <span className={`font-semibold ${(Number(form.total_revenue) - Number(form.total_cost)) >= 0 ? "text-success" : "text-destructive"}`}>
                    ${(Number(form.total_revenue) - Number(form.total_cost)).toLocaleString()}
                  </span>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Assigned To</Label>
                  <Select value={form.assigned_to} onValueChange={v => setForm({ ...form, assigned_to: v })}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{profiles.map(p => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Agent</Label>
                  <Select value={form.agent_id} onValueChange={v => setForm({ ...form, agent_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{agents.map(a => <SelectItem key={a.id} value={a.id}>{a.agent_name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
              <Button onClick={handleCreate}>Create Shipment</Button>
            </div>
          </DialogContent>
        </Dialog>
      } />

      {/* Filters */}
      <div className="flex gap-3 mb-4 flex-wrap items-center">
        <Input placeholder="Search shipments..." className="max-w-xs" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {STATUSES.map(s => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterMode} onValueChange={setFilterMode}>
          <SelectTrigger className="w-32"><SelectValue placeholder="Mode" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Modes</SelectItem>
            {MODES.map(m => <SelectItem key={m} value={m}>{m.toUpperCase()}</SelectItem>)}
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground ml-auto">{filtered.length} shipments</span>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Shipment #</TableHead><TableHead>Customer</TableHead><TableHead>Mode</TableHead>
                <TableHead>Origin → Dest</TableHead><TableHead>ETD</TableHead><TableHead>ETA</TableHead>
                <TableHead>Profit</TableHead><TableHead>Status</TableHead><TableHead>Agent</TableHead><TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(s => (
                <TableRow key={s.id} className={isDelayed(s) ? "bg-destructive/5" : ""}>
                  <TableCell className="font-medium font-display">
                    <div className="flex items-center gap-1.5">
                      {isDelayed(s) && <AlertTriangle className="h-3.5 w-3.5 text-destructive" />}
                      {s.shipment_number}
                    </div>
                  </TableCell>
                  <TableCell>{s.customers?.company_name || "—"}</TableCell>
                  <TableCell><span className="uppercase text-xs font-bold">{s.mode}</span></TableCell>
                  <TableCell>{s.origin || "—"} → {s.destination || "—"}</TableCell>
                  <TableCell>{s.etd ? new Date(s.etd).toLocaleDateString() : "—"}</TableCell>
                  <TableCell className={isDelayed(s) ? "text-destructive font-medium" : ""}>{s.eta ? new Date(s.eta).toLocaleDateString() : "—"}</TableCell>
                  <TableCell className={`font-medium ${Number(s.profit) >= 0 ? "text-success" : "text-destructive"}`}>
                    {s.profit != null ? `$${Number(s.profit).toLocaleString()}` : "—"}
                  </TableCell>
                  <TableCell><StatusBadge status={s.status.replace(/_/g, " ")} /></TableCell>
                  <TableCell>{s.agents?.agent_name || "—"}</TableCell>
                  <TableCell>
                    <Button size="sm" variant="ghost" onClick={() => loadDetail(s)}><Eye className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-8">No shipments found</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AppLayout>
  );
}
