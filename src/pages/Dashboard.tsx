import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserPlus, Building2, Target, FileText, Phone, Mail, Calendar, Ship, Truck, PackageCheck, DollarSign, TrendingUp, AlertTriangle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend } from "recharts";
import StatusBadge from "@/components/StatusBadge";
import { useRole } from "@/lib/useRole";

interface Stats {
  leads: number; customers: number; opportunities: number; quotations: number;
  pipelineValue: number; totalShipments: number; inTransit: number; delivered: number;
  totalProfit: number; dealsWon: number; dealsLost: number; delayedShipments: number;
}

type PipelineBySalesperson = { name: string; value: number; count: number };
type TradeLaneData = { lane: string; revenue: number; profit: number; count: number };
type MonthlyData = { month: string; revenue: number; profit: number; shipments: number };

export default function Dashboard() {
  const { role, isAdmin, canManageSales, canManageOperations, loading: roleLoading } = useRole();
  const [stats, setStats] = useState<Stats>({ leads: 0, customers: 0, opportunities: 0, quotations: 0, pipelineValue: 0, totalShipments: 0, inTransit: 0, delivered: 0, totalProfit: 0, dealsWon: 0, dealsLost: 0, delayedShipments: 0 });
  const [pipelineByPerson, setPipelineByPerson] = useState<PipelineBySalesperson[]>([]);
  const [tradeLanes, setTradeLanes] = useState<TradeLaneData[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [stageData, setStageData] = useState<{ name: string; value: number }[]>([]);
  const [upcomingTasks, setUpcomingTasks] = useState<any[]>([]);

  // Determine default tab based on role
  const getDefaultTab = () => {
    if (canManageOperations && !canManageSales) return "operations";
    return "sales";
  };

  useEffect(() => {
    async function load() {
      const [leads, customers, opportunities, quotations, activities, shipments, tasks] = await Promise.all([
        supabase.from("leads").select("id", { count: "exact", head: true }),
        supabase.from("customers").select("id", { count: "exact", head: true }),
        supabase.from("opportunities").select("id, estimated_value, assigned_to, stage"),
        supabase.from("quotations").select("id", { count: "exact", head: true }),
        supabase.from("activities").select("id, activity_type, notes, activity_date, leads(company_name), customers(company_name), opportunities(title)").order("activity_date", { ascending: false }).limit(10),
        supabase.from("shipments").select("id, status, origin, destination, total_revenue, total_cost, profit, eta, created_at"),
        supabase.from("tasks").select("id, description, due_date, status, assigned_to").eq("status", "pending").order("due_date", { ascending: true }).limit(8),
      ]);

      const opps = opportunities.data || [];
      const activeOpps = opps.filter(o => !["won", "lost"].includes(o.stage));
      const pipelineValue = activeOpps.reduce((sum, o) => sum + (Number(o.estimated_value) || 0), 0);
      const dealsWon = opps.filter(o => o.stage === "won").length;
      const dealsLost = opps.filter(o => o.stage === "lost").length;

      // Stage distribution for pie chart
      const stageCounts: Record<string, number> = {};
      opps.forEach(o => { stageCounts[o.stage] = (stageCounts[o.stage] || 0) + 1; });
      setStageData(Object.entries(stageCounts).map(([name, value]) => ({ name, value })));

      const ships = shipments.data || [];
      const totalProfit = ships.reduce((s, sh) => s + (Number(sh.profit) || 0), 0);
      const now = new Date();
      const delayedShipments = ships.filter(s => s.eta && new Date(s.eta) < now && !["delivered", "cancelled"].includes(s.status)).length;

      // Trade lane analysis
      const laneMap = new Map<string, TradeLaneData>();
      ships.forEach(s => {
        if (s.origin && s.destination) {
          const lane = `${s.origin} → ${s.destination}`;
          const existing = laneMap.get(lane) || { lane, revenue: 0, profit: 0, count: 0 };
          existing.revenue += Number(s.total_revenue) || 0;
          existing.profit += Number(s.profit) || 0;
          existing.count += 1;
          laneMap.set(lane, existing);
        }
      });
      setTradeLanes(Array.from(laneMap.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 10));

      // Monthly trend
      const monthMap = new Map<string, MonthlyData>();
      ships.forEach(s => {
        const d = new Date(s.created_at);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const existing = monthMap.get(key) || { month: key, revenue: 0, profit: 0, shipments: 0 };
        existing.revenue += Number(s.total_revenue) || 0;
        existing.profit += Number(s.profit) || 0;
        existing.shipments += 1;
        monthMap.set(key, existing);
      });
      setMonthlyData(Array.from(monthMap.values()).sort((a, b) => a.month.localeCompare(b.month)).slice(-12));

      setStats({
        leads: leads.count || 0, customers: customers.count || 0, opportunities: opps.length,
        quotations: quotations.count || 0, pipelineValue, totalShipments: ships.length,
        inTransit: ships.filter(s => ["in_transit", "at_port", "customs"].includes(s.status)).length,
        delivered: ships.filter(s => s.status === "delivered").length,
        totalProfit, dealsWon, dealsLost, delayedShipments,
      });

      const profiles = await supabase.from("profiles").select("id, full_name");
      const profileMap = new Map((profiles.data || []).map(p => [p.id, p.full_name]));
      const byPerson = new Map<string, { value: number; count: number }>();
      activeOpps.forEach(o => {
        const name = profileMap.get(o.assigned_to || "") || "Unassigned";
        const existing = byPerson.get(name) || { value: 0, count: 0 };
        byPerson.set(name, { value: existing.value + (Number(o.estimated_value) || 0), count: existing.count + 1 });
      });
      setPipelineByPerson(Array.from(byPerson.entries()).map(([name, v]) => ({ name, ...v })).sort((a, b) => b.value - a.value));
      setRecentActivities((activities.data as any) || []);
      setUpcomingTasks((tasks.data as any) || []);
    }
    load();
  }, []);

  const COLORS = ["hsl(220, 70%, 50%)", "hsl(38, 92%, 50%)", "hsl(160, 60%, 45%)", "hsl(0, 72%, 51%)", "hsl(280, 60%, 50%)"];

  // Role-based KPI cards
  const allKpiCards = [
    { title: "Leads", value: stats.leads, icon: UserPlus, color: "text-info", roles: ["admin", "sales"] },
    { title: "Customers", value: stats.customers, icon: Building2, color: "text-accent", roles: ["admin", "sales", "operations"] },
    { title: "Pipeline Value", value: `$${stats.pipelineValue.toLocaleString()}`, icon: Target, color: "text-warning", roles: ["admin", "sales"] },
    { title: "Deals Won", value: stats.dealsWon, icon: TrendingUp, color: "text-success", roles: ["admin", "sales"] },
    { title: "Shipments", value: stats.totalShipments, icon: Ship, color: "text-primary", roles: ["admin", "operations"] },
    { title: "In Transit", value: stats.inTransit, icon: Truck, color: "text-warning", roles: ["admin", "operations"] },
    { title: "Total Profit", value: `$${stats.totalProfit.toLocaleString()}`, icon: DollarSign, color: "text-success", roles: ["admin", "operations"] },
    { title: "Delayed", value: stats.delayedShipments, icon: AlertTriangle, color: "text-destructive", roles: ["admin", "operations"] },
  ];

  const kpiCards = role ? allKpiCards.filter(card => card.roles.includes(role)) : allKpiCards;

  const actIcon = (type: string) => {
    if (type === "call") return <Phone className="h-4 w-4 text-info" />;
    if (type === "email") return <Mail className="h-4 w-4 text-warning" />;
    return <Calendar className="h-4 w-4 text-accent" />;
  };

  const getRoleTitle = () => {
    switch (role) {
      case "admin": return "Admin Dashboard";
      case "sales": return "Sales Dashboard";
      case "operations": return "Operations Dashboard";
      case "viewer": return "Overview Dashboard";
      default: return "Dashboard";
    }
  };

  const getRoleDescription = () => {
    switch (role) {
      case "admin": return "SCLS — Complete CRM & TMS Overview";
      case "sales": return "SCLS — Sales Pipeline & Customer Insights";
      case "operations": return "SCLS — Shipments & Logistics Operations";
      case "viewer": return "SCLS — Read-Only Overview";
      default: return "SCLS CRM & TMS";
    }
  };

  return (
    <AppLayout>
      <PageHeader title={getRoleTitle()} description={getRoleDescription()} />

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        {kpiCards.map(c => (
          <Card key={c.title} className="animate-fade-in">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{c.title}</CardTitle>
              <c.icon className={`h-5 w-5 ${c.color}`} />
            </CardHeader>
            <CardContent><div className="text-3xl font-display font-bold">{c.value}</div></CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue={getDefaultTab()} className="space-y-4">
        <TabsList>
          {(canManageSales || isAdmin || role === "viewer") && <TabsTrigger value="sales">Sales</TabsTrigger>}
          {(canManageOperations || isAdmin || role === "viewer") && <TabsTrigger value="operations">Operations</TabsTrigger>}
          {(isAdmin || role === "viewer") && <TabsTrigger value="tradelanes">Trade Lanes</TabsTrigger>}
        </TabsList>

        {/* Sales Dashboard */}
        {(canManageSales || isAdmin || role === "viewer") && (
        <TabsContent value="sales" className="space-y-6">
          {role === "sales" && (
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">
                  <strong className="text-primary">Sales Focus:</strong> Track your pipeline, follow up on leads, 
                  close opportunities, and generate quotations to drive revenue growth.
                </p>
              </CardContent>
            </Card>
          )}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="font-display">Pipeline by Salesperson</CardTitle></CardHeader>
              <CardContent>
                {pipelineByPerson.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={pipelineByPerson}>
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip formatter={(v: number) => `$${v.toLocaleString()}`} />
                      <Bar dataKey="value" fill="hsl(220, 70%, 50%)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <p className="text-sm text-muted-foreground py-8 text-center">No pipeline data</p>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="font-display">Opportunity Stages</CardTitle></CardHeader>
              <CardContent>
                {stageData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie data={stageData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, value }) => `${name} (${value})`}>
                        {stageData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <p className="text-sm text-muted-foreground py-8 text-center">No data</p>}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="font-display">Recent Activities</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentActivities.map((a: any) => (
                    <div key={a.id} className="flex items-start gap-3 text-sm">
                      <div className="mt-0.5">{actIcon(a.activity_type)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium capitalize">{a.activity_type}</span>
                          {a.leads?.company_name && <span className="text-muted-foreground">— {a.leads.company_name}</span>}
                          {a.customers?.company_name && <span className="text-muted-foreground">— {a.customers.company_name}</span>}
                        </div>
                        {a.notes && <p className="text-muted-foreground truncate">{a.notes}</p>}
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">{new Date(a.activity_date).toLocaleDateString()}</span>
                    </div>
                  ))}
                  {recentActivities.length === 0 && <p className="text-sm text-muted-foreground">No activities yet</p>}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="font-display">Upcoming Tasks</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {upcomingTasks.map((t: any) => {
                    const overdue = t.due_date && new Date(t.due_date) < new Date();
                    return (
                      <div key={t.id} className={`flex items-center gap-3 text-sm rounded-lg border p-2.5 ${overdue ? "border-destructive/30 bg-destructive/5" : ""}`}>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{t.description}</p>
                        </div>
                        {t.due_date && (
                          <span className={`text-xs whitespace-nowrap ${overdue ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                            {overdue ? "⚠ " : ""}{new Date(t.due_date).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    );
                  })}
                  {upcomingTasks.length === 0 && <p className="text-sm text-muted-foreground">No pending tasks</p>}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        )}

        {/* Operations Dashboard */}
        {(canManageOperations || isAdmin || role === "viewer") && (
        <TabsContent value="operations" className="space-y-6">
          {role === "operations" && (
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">
                  <strong className="text-primary">Operations Focus:</strong> Monitor shipments, track containers, 
                  manage logistics timelines, and ensure smooth delivery operations.
                </p>
              </CardContent>
            </Card>
          )}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="font-display">Monthly Trends</CardTitle></CardHeader>
              <CardContent>
                {monthlyData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 90%)" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v: number) => `$${v.toLocaleString()}`} />
                      <Legend />
                      <Line type="monotone" dataKey="revenue" stroke="hsl(220, 70%, 50%)" strokeWidth={2} name="Revenue" />
                      <Line type="monotone" dataKey="profit" stroke="hsl(160, 60%, 45%)" strokeWidth={2} name="Profit" />
                    </LineChart>
                  </ResponsiveContainer>
                ) : <p className="text-sm text-muted-foreground py-8 text-center">No shipment data yet</p>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="font-display">Shipments by Month</CardTitle></CardHeader>
              <CardContent>
                {monthlyData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={monthlyData}>
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="shipments" fill="hsl(220, 70%, 50%)" radius={[4, 4, 0, 0]} name="Shipments" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <p className="text-sm text-muted-foreground py-8 text-center">No data</p>}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        )}

        {/* Trade Lanes Dashboard */}
        {(isAdmin || role === "viewer") && (
        <TabsContent value="tradelanes" className="space-y-6">
          {isAdmin && (
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">
                  <strong className="text-primary">Strategic Insights:</strong> Analyze trade lane performance, 
                  identify profitable routes, and optimize pricing strategies across corridors.
                </p>
              </CardContent>
            </Card>
          )}
          <Card>
            <CardHeader><CardTitle className="font-display">Revenue & Profit by Trade Lane</CardTitle></CardHeader>
            <CardContent>
              {tradeLanes.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={tradeLanes} layout="vertical">
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="lane" tick={{ fontSize: 11 }} width={160} />
                    <Tooltip formatter={(v: number) => `$${v.toLocaleString()}`} />
                    <Legend />
                    <Bar dataKey="revenue" fill="hsl(220, 70%, 50%)" name="Revenue" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="profit" fill="hsl(160, 60%, 45%)" name="Profit" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <p className="text-sm text-muted-foreground py-8 text-center">No trade lane data yet. Add origin/destination and costs to shipments.</p>}
            </CardContent>
          </Card>

          {tradeLanes.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {tradeLanes.slice(0, 6).map(tl => (
                <Card key={tl.lane}>
                  <CardContent className="pt-4">
                    <p className="text-sm font-medium truncate">{tl.lane}</p>
                    <div className="flex items-center gap-4 mt-2">
                      <div>
                        <p className="text-xs text-muted-foreground">Revenue</p>
                        <p className="text-lg font-display font-bold">${tl.revenue.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Profit</p>
                        <p className={`text-lg font-display font-bold ${tl.profit >= 0 ? "text-success" : "text-destructive"}`}>${tl.profit.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Shipments</p>
                        <p className="text-lg font-display font-bold">{tl.count}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        )}
      </Tabs>
    </AppLayout>
  );
}
