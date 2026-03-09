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
import { Progress } from "@/components/ui/progress";
import StatusBadge from "@/components/StatusBadge";
import { Plus, Warehouse, Eye, Package, ArrowDownToLine, ArrowUpFromLine, PackageCheck, Boxes, Truck } from "lucide-react";
import { toast } from "sonner";

type WarehouseT = {
  id: string; name: string; location: string | null; city: string | null; country: string | null;
  capacity_cbm: number | null; used_cbm: number | null; warehouse_type: string | null;
  contact_person: string | null; contact_phone: string | null; is_active: boolean;
  notes: string | null; created_at: string;
};

type WarehouseOrder = {
  id: string; warehouse_id: string; shipment_id: string | null;
  order_type: string; status: string; reference_number: string | null;
  items: any[]; total_packages: number | null; total_weight_kg: number | null;
  total_cbm: number | null; scheduled_date: string | null;
  completed_date: string | null; assigned_to: string | null;
  notes: string | null; created_at: string;
  warehouses?: { name: string } | null;
  shipments?: { shipment_number: string } | null;
};

const ORDER_TYPES = ["receive", "put_away", "pick", "pack", "dispatch"] as const;
const ORDER_STATUSES = ["pending", "in_progress", "completed", "cancelled"] as const;
const WH_TYPES = ["general", "cold_storage", "bonded", "hazmat", "open_yard"] as const;

const orderIcon = (type: string) => {
  switch (type) {
    case "receive": return <ArrowDownToLine className="h-4 w-4 text-info" />;
    case "put_away": return <Boxes className="h-4 w-4 text-accent" />;
    case "pick": return <Package className="h-4 w-4 text-warning" />;
    case "pack": return <PackageCheck className="h-4 w-4 text-primary" />;
    case "dispatch": return <Truck className="h-4 w-4 text-success" />;
    default: return <Package className="h-4 w-4" />;
  }
};

export default function Warehousing() {
  const { user } = useAuth();
  const [tab, setTab] = useState("orders");
  const [warehouses, setWarehouses] = useState<WarehouseT[]>([]);
  const [orders, setOrders] = useState<WarehouseOrder[]>([]);
  const [shipments, setShipments] = useState<{ id: string; shipment_number: string }[]>([]);
  const [profiles, setProfiles] = useState<{ id: string; full_name: string }[]>([]);
  const [whOpen, setWhOpen] = useState(false);
  const [orderOpen, setOrderOpen] = useState(false);
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterWh, setFilterWh] = useState("all");

  const [whForm, setWhForm] = useState({ name: "", location: "", city: "", country: "Saudi Arabia", capacity_cbm: "", warehouse_type: "general", contact_person: "", contact_phone: "", notes: "" });
  const [orderForm, setOrderForm] = useState({ warehouse_id: "", shipment_id: "", order_type: "receive", total_packages: "", total_weight_kg: "", total_cbm: "", scheduled_date: "", assigned_to: "", notes: "" });

  const load = async () => {
    const [wh, ord, ships, prof] = await Promise.all([
      supabase.from("warehouses").select("*").order("name"),
      supabase.from("warehouse_orders").select("*, warehouses(name), shipments(shipment_number)").order("created_at", { ascending: false }),
      supabase.from("shipments").select("id, shipment_number").order("created_at", { ascending: false }),
      supabase.from("profiles").select("id, full_name"),
    ]);
    setWarehouses((wh.data as any) || []);
    setOrders((ord.data as any) || []);
    setShipments(ships.data || []);
    setProfiles(prof.data || []);
  };

  useEffect(() => { load(); }, []);

  const filteredOrders = orders.filter(o => {
    if (filterType !== "all" && o.order_type !== filterType) return false;
    if (filterStatus !== "all" && o.status !== filterStatus) return false;
    if (filterWh !== "all" && o.warehouse_id !== filterWh) return false;
    return true;
  });

  const createWarehouse = async () => {
    if (!whForm.name) { toast.error("Name is required"); return; }
    const { error } = await supabase.from("warehouses").insert({
      name: whForm.name, location: whForm.location || null, city: whForm.city || null,
      country: whForm.country || null, capacity_cbm: whForm.capacity_cbm ? Number(whForm.capacity_cbm) : 0,
      warehouse_type: whForm.warehouse_type, contact_person: whForm.contact_person || null,
      contact_phone: whForm.contact_phone || null, notes: whForm.notes || null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Warehouse created");
    setWhOpen(false);
    setWhForm({ name: "", location: "", city: "", country: "Saudi Arabia", capacity_cbm: "", warehouse_type: "general", contact_person: "", contact_phone: "", notes: "" });
    load();
  };

  const createOrder = async () => {
    if (!orderForm.warehouse_id) { toast.error("Warehouse is required"); return; }
    const { error } = await supabase.from("warehouse_orders").insert({
      warehouse_id: orderForm.warehouse_id,
      shipment_id: orderForm.shipment_id || null,
      order_type: orderForm.order_type as any,
      total_packages: orderForm.total_packages ? Number(orderForm.total_packages) : 0,
      total_weight_kg: orderForm.total_weight_kg ? Number(orderForm.total_weight_kg) : 0,
      total_cbm: orderForm.total_cbm ? Number(orderForm.total_cbm) : 0,
      scheduled_date: orderForm.scheduled_date || null,
      assigned_to: orderForm.assigned_to || null,
      notes: orderForm.notes || null,
      created_by: user?.id,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Order created");
    setOrderOpen(false);
    setOrderForm({ warehouse_id: "", shipment_id: "", order_type: "receive", total_packages: "", total_weight_kg: "", total_cbm: "", scheduled_date: "", assigned_to: "", notes: "" });
    load();
  };

  const updateOrderStatus = async (id: string, status: string) => {
    const updates: any = { status };
    if (status === "completed") updates.completed_date = new Date().toISOString();
    const { error } = await supabase.from("warehouse_orders").update(updates).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Status updated");
    load();
  };

  // Stats
  const totalCapacity = warehouses.reduce((s, w) => s + Number(w.capacity_cbm || 0), 0);
  const totalUsed = warehouses.reduce((s, w) => s + Number(w.used_cbm || 0), 0);
  const pendingOrders = orders.filter(o => o.status === "pending").length;
  const inProgressOrders = orders.filter(o => o.status === "in_progress").length;

  return (
    <AppLayout>
      <PageHeader title="Warehousing" description="WMS — Receive, Put-Away, Pick, Pack, Dispatch" action={
        <div className="flex gap-2">
          <Dialog open={whOpen} onOpenChange={setWhOpen}>
            <DialogTrigger asChild><Button variant="outline"><Warehouse className="h-4 w-4 mr-2" />Add Warehouse</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New Warehouse</DialogTitle></DialogHeader>
              <div className="grid gap-3">
                <div><Label>Name *</Label><Input value={whForm.name} onChange={e => setWhForm({ ...whForm, name: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>City</Label><Input value={whForm.city} onChange={e => setWhForm({ ...whForm, city: e.target.value })} /></div>
                  <div><Label>Country</Label><Input value={whForm.country} onChange={e => setWhForm({ ...whForm, country: e.target.value })} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Location / Address</Label><Input value={whForm.location} onChange={e => setWhForm({ ...whForm, location: e.target.value })} /></div>
                  <div>
                    <Label>Type</Label>
                    <Select value={whForm.warehouse_type} onValueChange={v => setWhForm({ ...whForm, warehouse_type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{WH_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div><Label>Capacity (CBM)</Label><Input type="number" value={whForm.capacity_cbm} onChange={e => setWhForm({ ...whForm, capacity_cbm: e.target.value })} /></div>
                  <div><Label>Contact</Label><Input value={whForm.contact_person} onChange={e => setWhForm({ ...whForm, contact_person: e.target.value })} /></div>
                  <div><Label>Phone</Label><Input value={whForm.contact_phone} onChange={e => setWhForm({ ...whForm, contact_phone: e.target.value })} /></div>
                </div>
                <div><Label>Notes</Label><Textarea value={whForm.notes} onChange={e => setWhForm({ ...whForm, notes: e.target.value })} /></div>
                <Button onClick={createWarehouse}>Create Warehouse</Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={orderOpen} onOpenChange={setOrderOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />New Order</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New Warehouse Order</DialogTitle></DialogHeader>
              <div className="grid gap-3">
                <div>
                  <Label>Warehouse *</Label>
                  <Select value={orderForm.warehouse_id} onValueChange={v => setOrderForm({ ...orderForm, warehouse_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select warehouse" /></SelectTrigger>
                    <SelectContent>{warehouses.filter(w => w.is_active).map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Order Type</Label>
                    <Select value={orderForm.order_type} onValueChange={v => setOrderForm({ ...orderForm, order_type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{ORDER_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Shipment</Label>
                    <Select value={orderForm.shipment_id} onValueChange={v => setOrderForm({ ...orderForm, shipment_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                      <SelectContent>{shipments.map(s => <SelectItem key={s.id} value={s.id}>{s.shipment_number}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div><Label>Packages</Label><Input type="number" value={orderForm.total_packages} onChange={e => setOrderForm({ ...orderForm, total_packages: e.target.value })} /></div>
                  <div><Label>Weight (kg)</Label><Input type="number" value={orderForm.total_weight_kg} onChange={e => setOrderForm({ ...orderForm, total_weight_kg: e.target.value })} /></div>
                  <div><Label>CBM</Label><Input type="number" value={orderForm.total_cbm} onChange={e => setOrderForm({ ...orderForm, total_cbm: e.target.value })} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Scheduled Date</Label><Input type="date" value={orderForm.scheduled_date} onChange={e => setOrderForm({ ...orderForm, scheduled_date: e.target.value })} /></div>
                  <div>
                    <Label>Assigned To</Label>
                    <Select value={orderForm.assigned_to} onValueChange={v => setOrderForm({ ...orderForm, assigned_to: v })}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>{profiles.map(p => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div><Label>Notes</Label><Textarea value={orderForm.notes} onChange={e => setOrderForm({ ...orderForm, notes: e.target.value })} /></div>
                <Button onClick={createOrder}>Create Order</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      } />

      {/* Stats */}
      <div className="grid gap-3 md:grid-cols-4 mb-4">
        <Card><CardContent className="py-3 px-4"><p className="text-xs text-muted-foreground">Warehouses</p><p className="text-2xl font-display font-bold">{warehouses.length}</p></CardContent></Card>
        <Card>
          <CardContent className="py-3 px-4">
            <p className="text-xs text-muted-foreground">Capacity Usage</p>
            <p className="text-2xl font-display font-bold">{totalCapacity > 0 ? `${((totalUsed / totalCapacity) * 100).toFixed(0)}%` : "—"}</p>
            {totalCapacity > 0 && <Progress value={(totalUsed / totalCapacity) * 100} className="h-1.5 mt-1" />}
          </CardContent>
        </Card>
        <Card><CardContent className="py-3 px-4"><p className="text-xs text-muted-foreground">Pending Orders</p><p className="text-2xl font-display font-bold text-warning">{pendingOrders}</p></CardContent></Card>
        <Card><CardContent className="py-3 px-4"><p className="text-xs text-muted-foreground">In Progress</p><p className="text-2xl font-display font-bold text-info">{inProgressOrders}</p></CardContent></Card>
      </div>

      <div className="flex gap-2 mb-4">
        <Button variant={tab === "orders" ? "default" : "outline"} size="sm" onClick={() => setTab("orders")}>Orders</Button>
        <Button variant={tab === "warehouses" ? "default" : "outline"} size="sm" onClick={() => setTab("warehouses")}>Warehouses</Button>
      </div>

      {tab === "orders" && (
        <>
          <div className="flex gap-3 mb-4 flex-wrap items-center">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-36"><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {ORDER_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {ORDER_STATUSES.map(s => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterWh} onValueChange={setFilterWh}>
              <SelectTrigger className="w-48"><SelectValue placeholder="All Warehouses" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Warehouses</SelectItem>
                {warehouses.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground ml-auto">{filteredOrders.length} orders</span>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Warehouse</TableHead>
                    <TableHead>Shipment</TableHead>
                    <TableHead>Packages</TableHead>
                    <TableHead>Weight</TableHead>
                    <TableHead>CBM</TableHead>
                    <TableHead>Scheduled</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map(o => (
                    <TableRow key={o.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {orderIcon(o.order_type)}
                          <span className="capitalize text-sm font-medium">{o.order_type.replace(/_/g, " ")}</span>
                        </div>
                      </TableCell>
                      <TableCell>{(o.warehouses as any)?.name || "—"}</TableCell>
                      <TableCell>{(o.shipments as any)?.shipment_number || "—"}</TableCell>
                      <TableCell>{o.total_packages || "—"}</TableCell>
                      <TableCell>{o.total_weight_kg ? `${Number(o.total_weight_kg).toLocaleString()} kg` : "—"}</TableCell>
                      <TableCell>{o.total_cbm || "—"}</TableCell>
                      <TableCell>{o.scheduled_date ? new Date(o.scheduled_date).toLocaleDateString() : "—"}</TableCell>
                      <TableCell><StatusBadge status={o.status.replace(/_/g, " ")} /></TableCell>
                      <TableCell>
                        <Select value={o.status} onValueChange={v => updateOrderStatus(o.id, v)}>
                          <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>{ORDER_STATUSES.map(s => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredOrders.length === 0 && (
                    <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">No orders found</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      {tab === "warehouses" && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {warehouses.map(w => {
            const utilPct = w.capacity_cbm ? Math.min((Number(w.used_cbm || 0) / Number(w.capacity_cbm)) * 100, 100) : 0;
            return (
              <Card key={w.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="font-display flex items-center gap-2">
                    <Warehouse className="h-4 w-4" />
                    {w.name}
                    {!w.is_active && <span className="status-badge bg-destructive/10 text-destructive">Inactive</span>}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-muted-foreground">City:</span> {w.city || "—"}</div>
                    <div><span className="text-muted-foreground">Country:</span> {w.country || "—"}</div>
                    <div><span className="text-muted-foreground">Type:</span> <span className="capitalize">{(w.warehouse_type || "general").replace(/_/g, " ")}</span></div>
                    <div><span className="text-muted-foreground">Contact:</span> {w.contact_person || "—"}</div>
                  </div>
                  {w.capacity_cbm && Number(w.capacity_cbm) > 0 && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Capacity</span>
                        <span className="font-medium">{Number(w.used_cbm || 0).toLocaleString()} / {Number(w.capacity_cbm).toLocaleString()} CBM</span>
                      </div>
                      <Progress value={utilPct} className={`h-2 ${utilPct > 90 ? "[&>div]:bg-destructive" : utilPct > 70 ? "[&>div]:bg-warning" : "[&>div]:bg-success"}`} />
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
          {warehouses.length === 0 && (
            <Card className="col-span-full"><CardContent className="py-8 text-center text-muted-foreground">No warehouses configured</CardContent></Card>
          )}
        </div>
      )}
    </AppLayout>
  );
}