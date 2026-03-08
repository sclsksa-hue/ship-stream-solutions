import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { Download, DollarSign, TrendingUp, Ship, FileText, Users } from "lucide-react";

type Shipment = {
  id: string; shipment_number: string; customer_id: string; origin: string | null;
  destination: string | null; total_cost: number | null; total_revenue: number | null;
  profit: number | null; status: string; agent_id: string | null; carrier: string | null;
  mode: string; created_at: string;
  customers?: { company_name: string } | null;
  agents?: { agent_name: string } | null;
};
type Quotation = {
  id: string; quote_number: string; customer_id: string; selling_price: number | null;
  carrier_cost: number | null; total_amount: number | null; status: string; created_at: string;
  customers?: { company_name: string } | null;
};

const COLORS = [
  "hsl(var(--primary))", "hsl(var(--success))", "hsl(var(--warning))",
  "hsl(var(--accent))", "hsl(var(--destructive))", "hsl(var(--info))",
];

const exportCSV = (data: Record<string, any>[], filename: string) => {
  if (!data.length) return;
  const headers = Object.keys(data[0]);
  const csv = [headers.join(","), ...data.map(r => headers.map(h => `"${r[h] ?? ""}"`).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = `${filename}.csv`; a.click();
  URL.revokeObjectURL(url);
};

export default function Analytics() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);

  useEffect(() => {
    Promise.all([
      supabase.from("shipments").select("*, customers(company_name), agents(agent_name)").order("created_at", { ascending: false }),
      supabase.from("quotations").select("*, customers(company_name)").order("created_at", { ascending: false }),
    ]).then(([s, q]) => {
      setShipments((s.data as any) || []);
      setQuotations((q.data as any) || []);
    });
  }, []);

  // Profit per customer
  const customerProfit = useMemo(() => {
    const map = new Map<string, { name: string; revenue: number; cost: number; profit: number; shipments: number }>();
    shipments.forEach(s => {
      const name = s.customers?.company_name || "Unknown";
      if (!map.has(s.customer_id)) map.set(s.customer_id, { name, revenue: 0, cost: 0, profit: 0, shipments: 0 });
      const m = map.get(s.customer_id)!;
      m.revenue += Number(s.total_revenue || 0);
      m.cost += Number(s.total_cost || 0);
      m.profit += Number(s.profit || 0);
      m.shipments++;
    });
    return Array.from(map.values()).sort((a, b) => b.profit - a.profit);
  }, [shipments]);

  // Trade lane analytics
  const tradeLanes = useMemo(() => {
    const map = new Map<string, { lane: string; revenue: number; profit: number; shipments: number }>();
    shipments.forEach(s => {
      const lane = `${s.origin || "?"} → ${s.destination || "?"}`;
      if (!map.has(lane)) map.set(lane, { lane, revenue: 0, profit: 0, shipments: 0 });
      const m = map.get(lane)!;
      m.revenue += Number(s.total_revenue || 0);
      m.profit += Number(s.profit || 0);
      m.shipments++;
    });
    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 15);
  }, [shipments]);

  // Quotation vs Actual
  const quotationComparison = useMemo(() => {
    // Match quotations to shipments by customer and approximate date
    return quotations.filter(q => q.status === "accepted").map(q => ({
      quote: q.quote_number,
      customer: q.customers?.company_name || "Unknown",
      quoted_amount: Number(q.total_amount || q.selling_price || 0),
      quoted_cost: Number(q.carrier_cost || 0),
    }));
  }, [quotations]);

  // Monthly revenue trend
  const monthlyTrend = useMemo(() => {
    const map = new Map<string, { month: string; revenue: number; profit: number; cost: number }>();
    shipments.forEach(s => {
      const d = new Date(s.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!map.has(key)) map.set(key, { month: key, revenue: 0, profit: 0, cost: 0 });
      const m = map.get(key)!;
      m.revenue += Number(s.total_revenue || 0);
      m.profit += Number(s.profit || 0);
      m.cost += Number(s.total_cost || 0);
    });
    return Array.from(map.values()).sort((a, b) => a.month.localeCompare(b.month));
  }, [shipments]);

  // Agent/carrier performance
  const agentPerf = useMemo(() => {
    const map = new Map<string, { name: string; shipments: number; revenue: number; profit: number }>();
    shipments.forEach(s => {
      const name = s.agents?.agent_name || "No Agent";
      const key = s.agent_id || "none";
      if (!map.has(key)) map.set(key, { name, shipments: 0, revenue: 0, profit: 0 });
      const m = map.get(key)!;
      m.shipments++;
      m.revenue += Number(s.total_revenue || 0);
      m.profit += Number(s.profit || 0);
    });
    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
  }, [shipments]);

  // Mode distribution
  const modeDistribution = useMemo(() => {
    const map = new Map<string, number>();
    shipments.forEach(s => map.set(s.mode, (map.get(s.mode) || 0) + 1));
    return Array.from(map.entries()).map(([name, value]) => ({ name: name.toUpperCase(), value }));
  }, [shipments]);

  // KPIs
  const totalRevenue = shipments.reduce((a, s) => a + Number(s.total_revenue || 0), 0);
  const totalProfit = shipments.reduce((a, s) => a + Number(s.profit || 0), 0);
  const avgMargin = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : "0";

  const chartConfig = {
    revenue: { label: "Revenue", color: "hsl(var(--primary))" },
    profit: { label: "Profit", color: "hsl(var(--success))" },
    cost: { label: "Cost", color: "hsl(var(--destructive))" },
    shipments: { label: "Shipments", color: "hsl(var(--info))" },
  };

  return (
    <AppLayout>
      <PageHeader title="Analytics & Reporting" description="Business intelligence and performance insights" />

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-5 mb-6">
        <Card>
          <CardContent className="py-3 px-4">
            <div className="flex items-center gap-2 mb-1"><DollarSign className="h-4 w-4 text-muted-foreground" /><span className="text-xs text-muted-foreground">Total Revenue</span></div>
            <p className="text-2xl font-display font-bold">${totalRevenue.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 px-4">
            <div className="flex items-center gap-2 mb-1"><TrendingUp className="h-4 w-4 text-muted-foreground" /><span className="text-xs text-muted-foreground">Total Profit</span></div>
            <p className={`text-2xl font-display font-bold ${totalProfit >= 0 ? "text-success" : "text-destructive"}`}>${totalProfit.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 px-4">
            <div className="flex items-center gap-2 mb-1"><TrendingUp className="h-4 w-4 text-muted-foreground" /><span className="text-xs text-muted-foreground">Avg Margin</span></div>
            <p className="text-2xl font-display font-bold">{avgMargin}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 px-4">
            <div className="flex items-center gap-2 mb-1"><Ship className="h-4 w-4 text-muted-foreground" /><span className="text-xs text-muted-foreground">Total Shipments</span></div>
            <p className="text-2xl font-display font-bold">{shipments.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 px-4">
            <div className="flex items-center gap-2 mb-1"><FileText className="h-4 w-4 text-muted-foreground" /><span className="text-xs text-muted-foreground">Quotations</span></div>
            <p className="text-2xl font-display font-bold">{quotations.length}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="profit" className="space-y-4">
        <TabsList>
          <TabsTrigger value="profit">Profit Tracking</TabsTrigger>
          <TabsTrigger value="tradelane">Trade Lanes</TabsTrigger>
          <TabsTrigger value="quotation">Quotation vs Actual</TabsTrigger>
          <TabsTrigger value="agents">Agent Performance</TabsTrigger>
        </TabsList>

        {/* Profit Tracking */}
        <TabsContent value="profit" className="space-y-6">
          {/* Monthly Trend */}
          {monthlyTrend.length > 0 && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="font-display">Monthly Revenue & Profit</CardTitle>
                <Button size="sm" variant="outline" onClick={() => exportCSV(monthlyTrend, "monthly-trend")}>
                  <Download className="h-4 w-4 mr-1" /> Export
                </Button>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[300px]">
                  <LineChart data={monthlyTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line type="monotone" dataKey="revenue" stroke="var(--color-revenue)" strokeWidth={2} />
                    <Line type="monotone" dataKey="profit" stroke="var(--color-profit)" strokeWidth={2} />
                  </LineChart>
                </ChartContainer>
              </CardContent>
            </Card>
          )}

          {/* Profit per customer */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="font-display">Profit per Customer</CardTitle>
              <Button size="sm" variant="outline" onClick={() => exportCSV(customerProfit, "customer-profit")}>
                <Download className="h-4 w-4 mr-1" /> Export
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead><TableHead>Shipments</TableHead>
                    <TableHead>Revenue</TableHead><TableHead>Cost</TableHead><TableHead>Profit</TableHead><TableHead>Margin</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customerProfit.map(c => (
                    <TableRow key={c.name}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell>{c.shipments}</TableCell>
                      <TableCell>${c.revenue.toLocaleString()}</TableCell>
                      <TableCell>${c.cost.toLocaleString()}</TableCell>
                      <TableCell className={c.profit >= 0 ? "text-success font-medium" : "text-destructive font-medium"}>${c.profit.toLocaleString()}</TableCell>
                      <TableCell>{c.revenue > 0 ? ((c.profit / c.revenue) * 100).toFixed(1) + "%" : "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Mode distribution */}
          {modeDistribution.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="font-display">Shipment Mode Distribution</CardTitle></CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[250px]">
                  <PieChart>
                    <Pie data={modeDistribution} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                      {modeDistribution.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </PieChart>
                </ChartContainer>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Trade Lane Dashboard */}
        <TabsContent value="tradelane" className="space-y-6">
          {tradeLanes.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="font-display">Top Trade Lanes by Revenue</CardTitle></CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[350px]">
                  <BarChart data={tradeLanes.slice(0, 10)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="lane" type="category" tick={{ fontSize: 10 }} width={150} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="revenue" fill="var(--color-revenue)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="font-display">Trade Lane Details</CardTitle>
              <Button size="sm" variant="outline" onClick={() => exportCSV(tradeLanes, "trade-lanes")}>
                <Download className="h-4 w-4 mr-1" /> Export
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Trade Lane</TableHead><TableHead>Shipments</TableHead>
                    <TableHead>Revenue</TableHead><TableHead>Profit</TableHead><TableHead>Margin</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tradeLanes.map(t => (
                    <TableRow key={t.lane}>
                      <TableCell className="font-medium">{t.lane}</TableCell>
                      <TableCell>{t.shipments}</TableCell>
                      <TableCell>${t.revenue.toLocaleString()}</TableCell>
                      <TableCell className={t.profit >= 0 ? "text-success font-medium" : "text-destructive font-medium"}>${t.profit.toLocaleString()}</TableCell>
                      <TableCell>{t.revenue > 0 ? ((t.profit / t.revenue) * 100).toFixed(1) + "%" : "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Quotation vs Actual */}
        <TabsContent value="quotation" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="font-display">Quotation vs Actual Cost Comparison</CardTitle>
              <Button size="sm" variant="outline" onClick={() => exportCSV(quotationComparison, "quotation-comparison")}>
                <Download className="h-4 w-4 mr-1" /> Export
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Quotation</TableHead><TableHead>Customer</TableHead>
                    <TableHead>Quoted Amount</TableHead><TableHead>Quoted Cost</TableHead><TableHead>Expected Margin</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {quotationComparison.map(q => (
                    <TableRow key={q.quote}>
                      <TableCell className="font-medium font-display">{q.quote}</TableCell>
                      <TableCell>{q.customer}</TableCell>
                      <TableCell>${q.quoted_amount.toLocaleString()}</TableCell>
                      <TableCell>${q.quoted_cost.toLocaleString()}</TableCell>
                      <TableCell className="font-medium">
                        {q.quoted_amount > 0 ? (((q.quoted_amount - q.quoted_cost) / q.quoted_amount) * 100).toFixed(1) + "%" : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                  {quotationComparison.length === 0 && (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No accepted quotations found</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Agent Performance */}
        <TabsContent value="agents" className="space-y-6">
          {agentPerf.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="font-display">Agent Revenue</CardTitle></CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[300px]">
                  <BarChart data={agentPerf.slice(0, 10)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="revenue" fill="var(--color-revenue)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="profit" fill="var(--color-profit)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="font-display">Agent Performance Details</CardTitle>
              <Button size="sm" variant="outline" onClick={() => exportCSV(agentPerf, "agent-performance")}>
                <Download className="h-4 w-4 mr-1" /> Export
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Agent</TableHead><TableHead>Shipments</TableHead>
                    <TableHead>Revenue</TableHead><TableHead>Profit</TableHead><TableHead>Margin</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {agentPerf.map(a => (
                    <TableRow key={a.name}>
                      <TableCell className="font-medium">{a.name}</TableCell>
                      <TableCell>{a.shipments}</TableCell>
                      <TableCell>${a.revenue.toLocaleString()}</TableCell>
                      <TableCell className={a.profit >= 0 ? "text-success font-medium" : "text-destructive font-medium"}>${a.profit.toLocaleString()}</TableCell>
                      <TableCell>{a.revenue > 0 ? ((a.profit / a.revenue) * 100).toFixed(1) + "%" : "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}
