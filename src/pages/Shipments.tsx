import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useLocation } from "react-router-dom";
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
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import StatusBadge from "@/components/StatusBadge";
import { Plus, Ship, Eye, Package, MapPin, AlertTriangle, DollarSign, FileText, Bell, CheckCircle2, XCircle, Download, ShieldAlert, Shield } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { exportToCsv } from "@/lib/csvUtils";

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

const REQUIRED_DOCS = ["bill_of_lading", "invoice", "packing_list", "customs_declaration", "certificate_of_origin"] as const;

// Container max capacity reference
const CONTAINER_CAPACITY: Record<string, { maxWeightKg: number; maxCbm: number }> = {
  "20ft": { maxWeightKg: 28200, maxCbm: 33.2 },
  "40ft": { maxWeightKg: 28800, maxCbm: 67.7 },
  "40hc": { maxWeightKg: 28560, maxCbm: 76.3 },
  "45ft": { maxWeightKg: 27600, maxCbm: 86.0 },
  "reefer_20": { maxWeightKg: 27400, maxCbm: 28.3 },
  "reefer_40": { maxWeightKg: 27700, maxCbm: 59.3 },
};

export default function Shipments() {
  const { user } = useAuth();
  const location = useLocation();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [filtered, setFiltered] = useState<Shipment[]>([]);
  const [customers, setCustomers] = useState<{ id: string; company_name: string }[]>([]);
  const [agents, setAgents] = useState<{ id: string; agent_name: string }[]>([]);
  const [profiles, setProfiles] = useState<{ id: string; full_name: string }[]>([]);
  const [open, setOpen] = useState(false);
  const [detailShipment, setDetailShipment] = useState<Shipment | null>(null);
  const [trackingEvents, setTrackingEvents] = useState<any[]>([]);
  const [containers, setContainers] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [exceptions, setExceptions] = useState<any[]>([]);
  const [customsDeclarations, setCustomsDeclarations] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<{ type: string; message: string; shipment: string; severity: "warning" | "destructive" | "info" }[]>([]);

  // Filters
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterMode, setFilterMode] = useState("all");
  const [filterAgent, setFilterAgent] = useState("all");
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
    const shipData = (s.data as any) || [];
    setShipments(shipData);
    setCustomers(c.data || []);
    setAgents(a.data || []);
    setProfiles(p.data || []);
    generateAlerts(shipData);
  };

  // Generate automated alerts
  const generateAlerts = (ships: Shipment[]) => {
    const now = new Date();
    const newAlerts: typeof alerts = [];
    ships.forEach(s => {
      if (s.eta && new Date(s.eta) < now && !["delivered", "cancelled"].includes(s.status)) {
        newAlerts.push({ type: "delayed", message: `ETA passed (${new Date(s.eta).toLocaleDateString()})`, shipment: s.shipment_number, severity: "destructive" });
      }
      if (s.status === "customs") {
        const customsStart = new Date(s.created_at);
        const daysSince = (now.getTime() - customsStart.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSince > 3) {
          newAlerts.push({ type: "customs_delay", message: "In customs for extended period", shipment: s.shipment_number, severity: "warning" });
        }
      }
      if (s.etd) {
        const etd = new Date(s.etd);
        const daysUntil = (etd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
        if (daysUntil > 0 && daysUntil <= 2 && s.status === "booked") {
          newAlerts.push({ type: "upcoming_etd", message: `ETD in ${Math.ceil(daysUntil)} day(s)`, shipment: s.shipment_number, severity: "info" });
        }
      }
      if (s.mode === "multimodal") {
        newAlerts.push({ type: "multimodal", message: "Multimodal — verify leg transitions", shipment: s.shipment_number, severity: "info" });
      }
    });
    setAlerts(newAlerts);
  };

  useEffect(() => { 
    load(); 
    // Check if we're coming from a quotation
    const state = location.state as any;
    if (state?.fromQuotation) {
      setForm(prev => ({
        ...prev,
        ...state.fromQuotation
      }));
      setOpen(true);
      // Clear the state
      window.history.replaceState({}, document.title);
      toast.info("Creating shipment from quotation");
    }
  }, []);

  useEffect(() => {
    let result = shipments;
    if (filterStatus !== "all") result = result.filter(s => s.status === filterStatus);
    if (filterMode !== "all") result = result.filter(s => s.mode === filterMode);
    if (filterAgent !== "all") result = result.filter(s => s.agent_id === filterAgent);
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
  }, [shipments, filterStatus, filterMode, filterAgent, searchTerm]);

  const loadDetail = async (shipment: Shipment) => {
    setDetailShipment(shipment);
    const [te, ct, docs, exc, cust] = await Promise.all([
      supabase.from("tracking_events").select("*").eq("shipment_id", shipment.id).order("event_date"),
      supabase.from("containers").select("*").eq("shipment_id", shipment.id),
      supabase.from("documents").select("*").eq("shipment_id", shipment.id).order("created_at", { ascending: false }),
      supabase.from("shipment_exceptions").select("*").eq("shipment_id", shipment.id).order("created_at", { ascending: false }),
      supabase.from("customs_declarations").select("*").eq("shipment_id", shipment.id).order("created_at", { ascending: false }),
    ]);
    setTrackingEvents(te.data || []);
    setContainers(ct.data || []);
    setDocuments(docs.data || []);
    setExceptions(exc.data || []);
    setCustomsDeclarations(cust.data || []);
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

  const [newException, setNewException] = useState({ exception_type: "delay", severity: "medium", title: "", description: "" });
  const addException = async () => {
    if (!detailShipment || !newException.title) { toast.error("Title is required"); return; }
    const { error } = await supabase.from("shipment_exceptions").insert({
      shipment_id: detailShipment.id,
      exception_type: newException.exception_type,
      severity: newException.severity,
      title: newException.title,
      description: newException.description || null,
      reported_by: user?.id,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Exception logged");
    setNewException({ exception_type: "delay", severity: "medium", title: "", description: "" });
    loadDetail(detailShipment);
  };

  const resolveException = async (excId: string, notes: string) => {
    const { error } = await supabase.from("shipment_exceptions").update({
      resolved_at: new Date().toISOString(),
      resolution_notes: notes || null,
    }).eq("id", excId);
    if (error) { toast.error(error.message); return; }
    toast.success("Exception resolved");
    if (detailShipment) loadDetail(detailShipment);
  };

  const [newContainer, setNewContainer] = useState({ container_number: "", container_type: "20ft", weight_kg: "", cbm: "", packages: "", commodity: "", seal_number: "" });
  const addContainer = async () => {
    if (!detailShipment) return;
    const { error } = await supabase.from("containers").insert({
      shipment_id: detailShipment.id, container_number: newContainer.container_number || null,
      container_type: newContainer.container_type as any,
      weight_kg: newContainer.weight_kg ? Number(newContainer.weight_kg) : null,
      cbm: newContainer.cbm ? Number(newContainer.cbm) : null,
      packages: newContainer.packages ? Number(newContainer.packages) : null,
      commodity: newContainer.commodity || null,
      seal_number: newContainer.seal_number || null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Container added");
    setNewContainer({ container_number: "", container_type: "20ft", weight_kg: "", cbm: "", packages: "", commodity: "", seal_number: "" });
    loadDetail(detailShipment);
  };

  const completedMilestones = new Set(trackingEvents.map((e: any) => e.milestone));
  const now = new Date();
  const isDelayed = (s: Shipment) => s.eta && new Date(s.eta) < now && !["delivered", "cancelled"].includes(s.status);

  // Container utilization calculation
  const getContainerUtilization = (c: any) => {
    const cap = CONTAINER_CAPACITY[c.container_type];
    if (!cap) return { weightPct: 0, cbmPct: 0 };
    const weightPct = c.weight_kg ? Math.min((c.weight_kg / cap.maxWeightKg) * 100, 100) : 0;
    const cbmPct = c.cbm ? Math.min((c.cbm / cap.maxCbm) * 100, 100) : 0;
    return { weightPct, cbmPct };
  };

  // Packing suggestions
  const getPackingSuggestion = (c: any) => {
    const cap = CONTAINER_CAPACITY[c.container_type];
    if (!cap) return null;
    const { weightPct, cbmPct } = getContainerUtilization(c);
    if (weightPct > 95 || cbmPct > 95) return { text: "Near capacity — consider upsizing", severity: "destructive" as const };
    if (weightPct < 30 && cbmPct < 30) return { text: "Under-utilized — consider downsizing or consolidation", severity: "warning" as const };
    if (weightPct > 80 && cbmPct < 50) return { text: "Weight-heavy — check for volume optimization", severity: "info" as const };
    if (cbmPct > 80 && weightPct < 50) return { text: "Volume-heavy — check for weight capacity", severity: "info" as const };
    return null;
  };

  // Missing document check
  const getMissingDocs = () => {
    const uploadedTypes = new Set(documents.map((d: any) => d.document_type));
    return REQUIRED_DOCS.filter(t => !uploadedTypes.has(t));
  };

  // ========== DETAIL VIEW ==========
  if (detailShipment) {
    const missingDocs = getMissingDocs();
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

        <Tabs defaultValue="timeline" className="space-y-4">
          <TabsList>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="containers">Containers ({containers.length})</TabsTrigger>
            <TabsTrigger value="documents" className="flex items-center gap-1">
              Documents ({documents.length})
              {missingDocs.length > 0 && <span className="h-2 w-2 rounded-full bg-warning" />}
            </TabsTrigger>
            <TabsTrigger value="exceptions" className="flex items-center gap-1">
              <ShieldAlert className="h-3.5 w-3.5" />
              Exceptions ({exceptions.length})
              {exceptions.filter((e: any) => !e.resolved_at).length > 0 && <span className="h-2 w-2 rounded-full bg-destructive" />}
            </TabsTrigger>
            <TabsTrigger value="customs" className="flex items-center gap-1">
              <Shield className="h-3.5 w-3.5" />
              Customs ({customsDeclarations.length})
            </TabsTrigger>
          </TabsList>

          {/* Timeline Tab */}
          <TabsContent value="timeline">
            <Card>
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
          </TabsContent>

          {/* Containers Tab with Utilization */}
          <TabsContent value="containers">
            <Card>
              <CardHeader><CardTitle className="font-display flex items-center gap-2"><Package className="h-4 w-4" /> Containers & Utilization</CardTitle></CardHeader>
              <CardContent>
                {containers.length > 0 && (
                  <div className="space-y-4">
                    {containers.map((c: any) => {
                      const { weightPct, cbmPct } = getContainerUtilization(c);
                      const suggestion = getPackingSuggestion(c);
                      const cap = CONTAINER_CAPACITY[c.container_type];
                      return (
                        <div key={c.id} className="border rounded-lg p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Package className="h-5 w-5 text-muted-foreground" />
                              <div>
                                <span className="font-medium font-display">{c.container_number || "No Number"}</span>
                                <span className="text-xs text-muted-foreground ml-2 uppercase">{c.container_type}</span>
                              </div>
                            </div>
                            {c.seal_number && <span className="text-xs text-muted-foreground">Seal: {c.seal_number}</span>}
                          </div>

                          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                            <div><span className="text-muted-foreground">Weight:</span> {c.weight_kg ?? "—"} kg</div>
                            <div><span className="text-muted-foreground">CBM:</span> {c.cbm ?? "—"}</div>
                            <div><span className="text-muted-foreground">Packages:</span> {c.packages ?? "—"}</div>
                            <div><span className="text-muted-foreground">Commodity:</span> {c.commodity || "—"}</div>
                          </div>

                          {cap && (c.weight_kg || c.cbm) && (
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-1">
                                <div className="flex justify-between text-xs">
                                  <span className="text-muted-foreground">Weight Utilization</span>
                                  <span className="font-medium">{weightPct.toFixed(0)}%</span>
                                </div>
                                <Progress value={weightPct} className={`h-2 ${weightPct > 90 ? "[&>div]:bg-destructive" : weightPct > 70 ? "[&>div]:bg-warning" : "[&>div]:bg-success"}`} />
                                <span className="text-[10px] text-muted-foreground">{c.weight_kg ?? 0} / {cap.maxWeightKg} kg</span>
                              </div>
                              <div className="space-y-1">
                                <div className="flex justify-between text-xs">
                                  <span className="text-muted-foreground">Volume Utilization</span>
                                  <span className="font-medium">{cbmPct.toFixed(0)}%</span>
                                </div>
                                <Progress value={cbmPct} className={`h-2 ${cbmPct > 90 ? "[&>div]:bg-destructive" : cbmPct > 70 ? "[&>div]:bg-warning" : "[&>div]:bg-success"}`} />
                                <span className="text-[10px] text-muted-foreground">{c.cbm ?? 0} / {cap.maxCbm} CBM</span>
                              </div>
                            </div>
                          )}

                          {suggestion && (
                            <div className={`rounded-md px-3 py-2 text-xs flex items-center gap-2 ${
                              suggestion.severity === "destructive" ? "bg-destructive/10 text-destructive" :
                              suggestion.severity === "warning" ? "bg-warning/10 text-warning" :
                              "bg-info/10 text-info"
                            }`}>
                              <AlertTriangle className="h-3.5 w-3.5" />
                              {suggestion.text}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
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
                    <Input className="w-28" value={newContainer.commodity} onChange={e => setNewContainer({ ...newContainer, commodity: e.target.value })} />
                  </div>
                  <div>
                    <Label className="text-xs">Seal #</Label>
                    <Input className="w-24" value={newContainer.seal_number} onChange={e => setNewContainer({ ...newContainer, seal_number: e.target.value })} />
                  </div>
                  <Button size="sm" onClick={addContainer}>Add</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Documents Tab with Missing Docs Tracking */}
          <TabsContent value="documents">
            <Card>
              <CardHeader><CardTitle className="font-display flex items-center gap-2"><FileText className="h-4 w-4" /> Documents & Compliance</CardTitle></CardHeader>
              <CardContent>
                {/* Missing docs alert */}
                {missingDocs.length > 0 && (
                  <div className="mb-4 rounded-md bg-warning/10 border border-warning/20 p-3">
                    <div className="flex items-center gap-2 text-sm font-medium text-warning mb-2">
                      <AlertTriangle className="h-4 w-4" /> Missing Documents ({missingDocs.length})
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {missingDocs.map(d => (
                        <span key={d} className="bg-warning/20 text-warning text-xs px-2 py-1 rounded-md capitalize">
                          {d.replace(/_/g, " ")}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Document checklist */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-4">
                  {REQUIRED_DOCS.map(docType => {
                    const hasDoc = documents.some((d: any) => d.document_type === docType);
                    return (
                      <div key={docType} className={`flex items-center gap-2 rounded-md px-3 py-2 text-xs ${hasDoc ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                        {hasDoc ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                        <span className="capitalize">{docType.replace(/_/g, " ")}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Document list */}
                {documents.length > 0 && (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>File</TableHead><TableHead>Type</TableHead>
                        <TableHead>Size</TableHead><TableHead>Uploaded</TableHead><TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {documents.map((d: any) => (
                        <TableRow key={d.id}>
                          <TableCell className="font-medium flex items-center gap-2"><FileText className="h-4 w-4 text-muted-foreground" />{d.file_name}</TableCell>
                          <TableCell><StatusBadge status={d.document_type.replace(/_/g, " ")} /></TableCell>
                          <TableCell>{d.file_size ? `${(d.file_size / 1024).toFixed(1)} KB` : "—"}</TableCell>
                          <TableCell>{new Date(d.created_at).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <Button size="sm" variant="ghost" asChild>
                              <a href={d.file_url} target="_blank" rel="noopener noreferrer"><Eye className="h-4 w-4" /></a>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
                {documents.length === 0 && (
                  <p className="text-center text-muted-foreground py-4 text-sm">No documents uploaded for this shipment</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Exceptions Tab */}
          <TabsContent value="exceptions">
            <Card>
              <CardHeader><CardTitle className="font-display flex items-center gap-2"><ShieldAlert className="h-4 w-4" /> Incident & Exception Log</CardTitle></CardHeader>
              <CardContent>
                {exceptions.length > 0 && (
                  <div className="space-y-3 mb-4">
                    {exceptions.map((exc: any) => {
                      const isOpen = !exc.resolved_at;
                      const sevColor = exc.severity === "critical" ? "bg-destructive/10 text-destructive border-destructive/20" :
                        exc.severity === "high" ? "bg-warning/10 text-warning border-warning/20" :
                        exc.severity === "medium" ? "bg-info/10 text-info border-info/20" :
                        "bg-muted text-muted-foreground border-muted";
                      return (
                        <div key={exc.id} className={`rounded-lg border p-4 space-y-2 ${isOpen ? "" : "opacity-60"}`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className={`status-badge ${sevColor}`}>{exc.severity}</span>
                              <span className="text-xs uppercase font-medium text-muted-foreground">{exc.exception_type.replace(/_/g, " ")}</span>
                              {isOpen ? (
                                <span className="status-badge bg-destructive/10 text-destructive">Open</span>
                              ) : (
                                <span className="status-badge bg-success/10 text-success">Resolved</span>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground">{new Date(exc.created_at).toLocaleDateString()}</span>
                          </div>
                          <p className="font-medium text-sm">{exc.title}</p>
                          {exc.description && <p className="text-sm text-muted-foreground">{exc.description}</p>}
                          {exc.resolved_at && exc.resolution_notes && (
                            <div className="bg-success/5 rounded-md p-2 text-xs">
                              <span className="text-success font-medium">Resolution:</span> {exc.resolution_notes}
                            </div>
                          )}
                          {isOpen && (
                            <Button size="sm" variant="outline" className="text-xs" onClick={() => {
                              const notes = prompt("Resolution notes:");
                              if (notes !== null) resolveException(exc.id, notes);
                            }}>
                              <CheckCircle2 className="h-3 w-3 mr-1" /> Resolve
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
                {exceptions.length === 0 && (
                  <p className="text-center text-muted-foreground py-4 text-sm mb-4">No exceptions logged</p>
                )}

                <div className="border-t pt-4">
                  <p className="text-sm font-medium mb-3">Log New Exception</p>
                  <div className="flex gap-2 flex-wrap items-end">
                    <div>
                      <Label className="text-xs">Type</Label>
                      <Select value={newException.exception_type} onValueChange={v => setNewException({ ...newException, exception_type: v })}>
                        <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {["delay", "damage", "customs_hold", "documentation", "safety", "temperature", "lost_cargo", "other"].map(t =>
                            <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Severity</Label>
                      <Select value={newException.severity} onValueChange={v => setNewException({ ...newException, severity: v })}>
                        <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {["low", "medium", "high", "critical"].map(s =>
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex-1 min-w-[200px]">
                      <Label className="text-xs">Title *</Label>
                      <Input value={newException.title} onChange={e => setNewException({ ...newException, title: e.target.value })} placeholder="Brief description..." />
                    </div>
                    <Button size="sm" onClick={addException}><Plus className="h-4 w-4 mr-1" />Log</Button>
                  </div>
                  <div className="mt-2">
                    <Label className="text-xs">Details</Label>
                    <Textarea value={newException.description} onChange={e => setNewException({ ...newException, description: e.target.value })} placeholder="Additional details..." className="h-16" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </AppLayout>
    );
  }

  // ========== LIST VIEW ==========
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

      {/* Alerts Banner */}
      {alerts.length > 0 && (
        <Card className="mb-4 border-warning/30 bg-warning/5">
          <CardContent className="py-3">
            <div className="flex items-center gap-2 mb-2">
              <Bell className="h-4 w-4 text-warning" />
              <span className="text-sm font-medium">Shipment Alerts ({alerts.length})</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {alerts.slice(0, 8).map((a, i) => (
                <span key={i} className={`text-xs px-2 py-1 rounded-md ${
                  a.severity === "destructive" ? "bg-destructive/10 text-destructive" :
                  a.severity === "warning" ? "bg-warning/10 text-warning" :
                  "bg-info/10 text-info"
                }`}>
                  <span className="font-medium">{a.shipment}</span> — {a.message}
                </span>
              ))}
              {alerts.length > 8 && <span className="text-xs text-muted-foreground">+{alerts.length - 8} more</span>}
            </div>
          </CardContent>
        </Card>
      )}

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
        <Select value={filterAgent} onValueChange={setFilterAgent}>
          <SelectTrigger className="w-40"><SelectValue placeholder="All Agents" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Agents</SelectItem>
            {agents.map(a => <SelectItem key={a.id} value={a.id}>{a.agent_name}</SelectItem>)}
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground ml-auto">{filtered.length} shipments</span>
        <Button size="sm" variant="outline" onClick={() => exportToCsv(filtered.map(s => ({
          shipment_number: s.shipment_number, customer: s.customers?.company_name || "", mode: s.mode,
          origin: s.origin || "", destination: s.destination || "", etd: s.etd || "", eta: s.eta || "",
          status: s.status, agent: s.agents?.agent_name || "", cost: s.total_cost || 0,
          revenue: s.total_revenue || 0, profit: s.profit || 0,
        })), "shipments")}>
          <Download className="h-4 w-4 mr-1" />CSV
        </Button>
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
