import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { Plus, Pencil, TrendingUp, Ship, DollarSign, Clock } from "lucide-react";
import { toast } from "sonner";

type Agent = {
  id: string; agent_name: string; country: string | null; city: string | null;
  contact_person: string | null; phone: string | null; email: string | null;
  agent_type: string | null; notes: string | null;
};

type AgentPerformance = {
  agent_id: string; agent_name: string;
  total_shipments: number; delivered: number; in_transit: number; delayed: number;
  total_revenue: number; total_profit: number;
  on_time_rate: number;
};

const emptyForm = { agent_name: "", country: "", city: "", contact_person: "", phone: "", email: "", agent_type: "overseas_agent", notes: "" };

export default function Agents() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [performance, setPerformance] = useState<AgentPerformance[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Agent | null>(null);
  const [form, setForm] = useState(emptyForm);

  const load = async () => {
    const [agentRes, shipRes] = await Promise.all([
      supabase.from("agents").select("*").order("agent_name"),
      supabase.from("shipments").select("agent_id, status, eta, total_revenue, profit, agents(agent_name)").not("agent_id", "is", null),
    ]);
    setAgents(agentRes.data || []);

    // Calculate performance metrics
    const shipments = (shipRes.data as any[]) || [];
    const now = new Date();
    const agentMap = new Map<string, AgentPerformance>();

    shipments.forEach((s: any) => {
      if (!s.agent_id) return;
      if (!agentMap.has(s.agent_id)) {
        agentMap.set(s.agent_id, {
          agent_id: s.agent_id,
          agent_name: s.agents?.agent_name || "Unknown",
          total_shipments: 0, delivered: 0, in_transit: 0, delayed: 0,
          total_revenue: 0, total_profit: 0, on_time_rate: 0,
        });
      }
      const p = agentMap.get(s.agent_id)!;
      p.total_shipments++;
      if (s.status === "delivered") p.delivered++;
      if (["in_transit", "at_port", "customs"].includes(s.status)) p.in_transit++;
      if (s.eta && new Date(s.eta) < now && !["delivered", "cancelled"].includes(s.status)) p.delayed++;
      p.total_revenue += Number(s.total_revenue || 0);
      p.total_profit += Number(s.profit || 0);
    });

    agentMap.forEach(p => {
      p.on_time_rate = p.total_shipments > 0 ? Math.round(((p.delivered) / Math.max(p.delivered + p.delayed, 1)) * 100) : 0;
    });

    setPerformance(Array.from(agentMap.values()).sort((a, b) => b.total_shipments - a.total_shipments));
  };

  useEffect(() => { load(); }, []);

  const openEdit = (a: Agent) => {
    setEditing(a);
    setForm({ agent_name: a.agent_name, country: a.country || "", city: a.city || "", contact_person: a.contact_person || "", phone: a.phone || "", email: a.email || "", agent_type: a.agent_type || "overseas_agent", notes: a.notes || "" });
    setOpen(true);
  };

  const handleSave = async () => {
    if (!form.agent_name) { toast.error("Agent name required"); return; }
    const payload = {
      agent_name: form.agent_name, country: form.country || null, city: form.city || null,
      contact_person: form.contact_person || null, phone: form.phone || null,
      email: form.email || null, agent_type: form.agent_type || null, notes: form.notes || null,
    };
    const { error } = editing
      ? await supabase.from("agents").update(payload).eq("id", editing.id)
      : await supabase.from("agents").insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success(editing ? "Agent updated" : "Agent created");
    setOpen(false); setEditing(null); setForm(emptyForm); load();
  };

  const chartConfig = {
    total_shipments: { label: "Shipments", color: "hsl(var(--primary))" },
    total_profit: { label: "Profit", color: "hsl(var(--success))" },
  };

  return (
    <AppLayout>
      <PageHeader title="Agents" description="Partner network & performance" action={
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditing(null); setForm(emptyForm); } }}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />New Agent</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing ? "Edit Agent" : "New Agent"}</DialogTitle></DialogHeader>
            <div className="grid gap-3">
              <div><Label>Agent Name *</Label><Input value={form.agent_name} onChange={e => setForm({ ...form, agent_name: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Country</Label><Input value={form.country} onChange={e => setForm({ ...form, country: e.target.value })} /></div>
                <div><Label>City</Label><Input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} /></div>
              </div>
              <div><Label>Contact Person</Label><Input value={form.contact_person} onChange={e => setForm({ ...form, contact_person: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Phone</Label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
                <div><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
              </div>
              <div><Label>Type</Label><Input value={form.agent_type} onChange={e => setForm({ ...form, agent_type: e.target.value })} placeholder="overseas_agent, shipping_line, trucking..." /></div>
              <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
              <Button onClick={handleSave}>{editing ? "Update" : "Create"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      } />

      <Tabs defaultValue="list" className="space-y-4">
        <TabsList>
          <TabsTrigger value="list">Agent List</TabsTrigger>
          <TabsTrigger value="performance">Performance Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="list">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead><TableHead>Country</TableHead><TableHead>City</TableHead>
                    <TableHead>Contact</TableHead><TableHead>Phone</TableHead><TableHead>Email</TableHead>
                    <TableHead>Type</TableHead><TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {agents.map(a => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">{a.agent_name}</TableCell>
                      <TableCell>{a.country || "—"}</TableCell>
                      <TableCell>{a.city || "—"}</TableCell>
                      <TableCell>{a.contact_person || "—"}</TableCell>
                      <TableCell>{a.phone || "—"}</TableCell>
                      <TableCell>{a.email || "—"}</TableCell>
                      <TableCell>{a.agent_type || "—"}</TableCell>
                      <TableCell><Button size="sm" variant="ghost" onClick={() => openEdit(a)}><Pencil className="h-4 w-4" /></Button></TableCell>
                    </TableRow>
                  ))}
                  {agents.length === 0 && (
                    <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No agents yet</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance">
          {/* KPI Cards */}
          <div className="grid gap-4 md:grid-cols-4 mb-6">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-1"><Ship className="h-3 w-3" /> Total Agents</CardTitle></CardHeader>
              <CardContent><span className="text-2xl font-display font-bold">{agents.length}</span></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-1"><TrendingUp className="h-3 w-3" /> Active (with shipments)</CardTitle></CardHeader>
              <CardContent><span className="text-2xl font-display font-bold">{performance.length}</span></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-1"><DollarSign className="h-3 w-3" /> Total Revenue</CardTitle></CardHeader>
              <CardContent><span className="text-2xl font-display font-bold">${performance.reduce((a, p) => a + p.total_revenue, 0).toLocaleString()}</span></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> Avg On-Time Rate</CardTitle></CardHeader>
              <CardContent>
                <span className="text-2xl font-display font-bold">
                  {performance.length > 0 ? Math.round(performance.reduce((a, p) => a + p.on_time_rate, 0) / performance.length) : 0}%
                </span>
              </CardContent>
            </Card>
          </div>

          {/* Chart */}
          {performance.length > 0 && (
            <Card className="mb-6">
              <CardHeader><CardTitle className="font-display">Shipments by Agent</CardTitle></CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[300px]">
                  <BarChart data={performance.slice(0, 10)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="agent_name" tick={{ fontSize: 11 }} />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="total_shipments" fill="var(--color-total_shipments)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          )}

          {/* Performance table */}
          <Card>
            <CardHeader><CardTitle className="font-display">Agent Performance Details</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Agent</TableHead><TableHead>Shipments</TableHead><TableHead>Delivered</TableHead>
                    <TableHead>In Transit</TableHead><TableHead>Delayed</TableHead><TableHead>On-Time Rate</TableHead>
                    <TableHead>Revenue</TableHead><TableHead>Profit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {performance.map(p => (
                    <TableRow key={p.agent_id}>
                      <TableCell className="font-medium">{p.agent_name}</TableCell>
                      <TableCell>{p.total_shipments}</TableCell>
                      <TableCell className="text-success">{p.delivered}</TableCell>
                      <TableCell>{p.in_transit}</TableCell>
                      <TableCell className={p.delayed > 0 ? "text-destructive font-medium" : ""}>{p.delayed}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={p.on_time_rate} className={`h-2 w-16 ${p.on_time_rate >= 80 ? "[&>div]:bg-success" : p.on_time_rate >= 50 ? "[&>div]:bg-warning" : "[&>div]:bg-destructive"}`} />
                          <span className="text-xs font-medium">{p.on_time_rate}%</span>
                        </div>
                      </TableCell>
                      <TableCell>${p.total_revenue.toLocaleString()}</TableCell>
                      <TableCell className={p.total_profit >= 0 ? "text-success font-medium" : "text-destructive font-medium"}>
                        ${p.total_profit.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                  {performance.length === 0 && (
                    <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No agent performance data yet</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}
