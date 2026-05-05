import { useEffect, useMemo, useState } from "react";
import AppLayout from "@/components/AppLayout";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useRole } from "@/lib/useRole";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { exportToExcel, exportToPDF } from "@/lib/exportReport";
import { FileSpreadsheet, FileText } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, FunnelChart, Funnel, LabelList,
} from "recharts";

const COLORS = ["hsl(var(--primary))", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899"];
const MONTHLY_TARGET = 100000;

function ExportButtons({ name, excel, pdf }: { name: string; excel: () => void; pdf: () => void }) {
  return (
    <div className="flex gap-2">
      <Button size="sm" variant="outline" onClick={excel}><FileSpreadsheet className="h-4 w-4 ml-1" />Excel</Button>
      <Button size="sm" variant="outline" onClick={pdf}><FileText className="h-4 w-4 ml-1" />PDF</Button>
    </div>
  );
}

export default function Reports() {
  const { role, loading: roleLoading } = useRole();
  const { user } = useAuth();
  const [quotations, setQuotations] = useState<any[]>([]);
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (roleLoading) return;
    (async () => {
      const [q, o, l, p, c] = await Promise.all([
        supabase.from("quotations").select("*"),
        supabase.from("opportunities").select("*"),
        supabase.from("leads").select("*"),
        supabase.from("profiles").select("id,full_name,email"),
        supabase.from("customers").select("id,company_name"),
      ]);
      setQuotations(q.data || []);
      setOpportunities(o.data || []);
      setLeads(l.data || []);
      setProfiles(p.data || []);
      setCustomers(c.data || []);
      setLoading(false);
    })();
  }, [roleLoading]);

  const profileName = (id?: string | null) => profiles.find((p) => p.id === id)?.full_name || "—";
  const customerName = (id?: string | null) => customers.find((c) => c.id === id)?.company_name || "—";

  // Revenue by month (accepted quotations)
  const revenueByMonth = useMemo(() => {
    const map = new Map<string, number>();
    quotations.filter((q) => q.status === "accepted").forEach((q) => {
      const d = new Date(q.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      map.set(key, (map.get(key) || 0) + Number(q.total_amount || 0));
    });
    return Array.from(map.entries()).sort().map(([month, revenue]) => ({ month, revenue }));
  }, [quotations]);

  const pipelineFunnel = useMemo(() => {
    const stages = ["prospecting", "qualification", "proposal", "negotiation", "won"];
    return stages.map((s, i) => ({
      name: s,
      value: opportunities.filter((o) => o.stage === s).length,
      fill: COLORS[i % COLORS.length],
    }));
  }, [opportunities]);

  const agentPerformance = useMemo(() => {
    const map = new Map<string, { name: string; won: number; revenue: number }>();
    opportunities.forEach((o) => {
      if (!o.assigned_to) return;
      const cur = map.get(o.assigned_to) || { name: profileName(o.assigned_to), won: 0, revenue: 0 };
      if (o.stage === "won") {
        cur.won += 1;
        cur.revenue += Number(o.estimated_value || 0);
      }
      map.set(o.assigned_to, cur);
    });
    return Array.from(map.values()).map((a) => ({ ...a, target: Math.round((a.revenue / MONTHLY_TARGET) * 100) }));
  }, [opportunities, profiles]);

  const leadsBySource = useMemo(() => {
    const map = new Map<string, { total: number; converted: number }>();
    leads.forEach((l) => {
      const src = l.source || "غير محدد";
      const cur = map.get(src) || { total: 0, converted: 0 };
      cur.total += 1;
      if (l.status === "converted" || l.status === "qualified") cur.converted += 1;
      map.set(src, cur);
    });
    return Array.from(map.entries()).map(([source, v]) => ({
      source,
      conversion: v.total ? Math.round((v.converted / v.total) * 100) : 0,
      total: v.total,
    }));
  }, [leads]);

  const topClients = useMemo(() => {
    const map = new Map<string, number>();
    quotations.filter((q) => q.status === "accepted").forEach((q) => {
      map.set(q.customer_id, (map.get(q.customer_id) || 0) + Number(q.total_amount || 0));
    });
    return Array.from(map.entries())
      .map(([cid, value]) => ({ client: customerName(cid), value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [quotations, customers]);

  // Sales agent personal
  const myDeals = opportunities.filter((o) => o.assigned_to === user?.id);
  const myWonRevenue = myDeals.filter((o) => o.stage === "won").reduce((s, o) => s + Number(o.estimated_value || 0), 0);
  const myDealsByStage = useMemo(() => {
    const stages = ["prospecting", "qualification", "proposal", "negotiation", "won", "lost"];
    return stages.map((s, i) => ({ name: s, value: myDeals.filter((o) => o.stage === s).length, fill: COLORS[i % COLORS.length] }));
  }, [myDeals]);
  const now = new Date();
  const myRevenueThisMonth = quotations.filter((q) => q.created_by === user?.id && q.status === "accepted" && new Date(q.created_at).getMonth() === now.getMonth() && new Date(q.created_at).getFullYear() === now.getFullYear()).reduce((s, q) => s + Number(q.total_amount || 0), 0);
  const myRevenueLastMonth = quotations.filter((q) => {
    if (q.created_by !== user?.id || q.status !== "accepted") return false;
    const d = new Date(q.created_at);
    const lm = new Date(now.getFullYear(), now.getMonth() - 1);
    return d.getMonth() === lm.getMonth() && d.getFullYear() === lm.getFullYear();
  }).reduce((s, q) => s + Number(q.total_amount || 0), 0);

  // Finance
  const pendingInvoice = quotations.filter((q) => q.status === "accepted" && !q.invoiced);
  const financeRevenueThisMonth = quotations.filter((q) => q.status === "accepted" && new Date(q.created_at).getMonth() === now.getMonth()).reduce((s, q) => s + Number(q.total_amount || 0), 0);
  const paymentTerms = useMemo(() => {
    const map = new Map<string, number>();
    quotations.filter((q) => q.status === "accepted").forEach((q) => {
      const term = (q.terms as any)?.payment || "غير محدد";
      map.set(term, (map.get(term) || 0) + 1);
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [quotations]);

  if (roleLoading || loading) {
    return <AppLayout><div className="p-8 text-center text-muted-foreground">جاري التحميل...</div></AppLayout>;
  }

  const isManagerView = role === "super_admin" || role === "sales_manager" || role === "admin";
  const isAgent = role === "sales_agent" || role === "sales";
  const isFinance = role === "finance" || role === "accountant";
  const isMarketing = role === "marketing";

  return (
    <AppLayout>
      <PageHeader title="التقارير والتحليلات" description="نظرة شاملة على الأداء" />

      {isManagerView && (
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>الإيرادات الشهرية</CardTitle>
              <ExportButtons name="revenue"
                excel={() => exportToExcel("revenue_by_month", [{ name: "Revenue", rows: revenueByMonth }])}
                pdf={() => exportToPDF("revenue_by_month", "Revenue by Month", [{ name: "Revenue", columns: ["Month", "Revenue"], rows: revenueByMonth.map((r) => [r.month, r.revenue]) }])}
              />
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={revenueByMonth}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" /><YAxis /><Tooltip /><Legend />
                  <Bar dataKey="revenue" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>قمع المبيعات</CardTitle>
                <ExportButtons name="pipeline"
                  excel={() => exportToExcel("pipeline_funnel", [{ name: "Funnel", rows: pipelineFunnel }])}
                  pdf={() => exportToPDF("pipeline_funnel", "Pipeline Funnel", [{ name: "Funnel", columns: ["Stage", "Count"], rows: pipelineFunnel.map((r) => [r.name, r.value]) }])}
                />
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <FunnelChart>
                    <Tooltip />
                    <Funnel dataKey="value" data={pipelineFunnel} isAnimationActive>
                      <LabelList position="right" fill="hsl(var(--foreground))" stroke="none" dataKey="name" />
                    </Funnel>
                  </FunnelChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>تحويل العملاء المحتملين حسب المصدر</CardTitle>
                <ExportButtons name="conversion"
                  excel={() => exportToExcel("conversion_by_source", [{ name: "Conversion", rows: leadsBySource }])}
                  pdf={() => exportToPDF("conversion_by_source", "Conversion by Source", [{ name: "Conversion", columns: ["Source", "Total", "Conversion %"], rows: leadsBySource.map((r) => [r.source, r.total, `${r.conversion}%`]) }])}
                />
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={leadsBySource} dataKey="conversion" nameKey="source" cx="50%" cy="50%" outerRadius={100} label>
                      {leadsBySource.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip /><Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>أداء المندوبين</CardTitle>
              <ExportButtons name="agents"
                excel={() => exportToExcel("agent_performance", [{ name: "Agents", rows: agentPerformance }])}
                pdf={() => exportToPDF("agent_performance", "Agent Performance", [{ name: "Agents", columns: ["Name", "Won", "Revenue", "Target %"], rows: agentPerformance.map((a) => [a.name, a.won, a.revenue, `${a.target}%`]) }])}
              />
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>الاسم</TableHead><TableHead>الصفقات الفائزة</TableHead><TableHead>الإيرادات</TableHead><TableHead>نسبة الهدف</TableHead></TableRow></TableHeader>
                <TableBody>
                  {agentPerformance.map((a, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{a.name}</TableCell>
                      <TableCell>{a.won}</TableCell>
                      <TableCell>{a.revenue.toLocaleString()} ر.س</TableCell>
                      <TableCell><div className="flex items-center gap-2"><Progress value={Math.min(a.target, 100)} className="w-24" /><span className="text-xs">{a.target}%</span></div></TableCell>
                    </TableRow>
                  ))}
                  {!agentPerformance.length && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">لا توجد بيانات</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>أفضل العملاء حسب قيمة الصفقات</CardTitle>
              <ExportButtons name="top_clients"
                excel={() => exportToExcel("top_clients", [{ name: "Clients", rows: topClients }])}
                pdf={() => exportToPDF("top_clients", "Top Clients", [{ name: "Clients", columns: ["Client", "Value"], rows: topClients.map((c) => [c.client, c.value]) }])}
              />
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>العميل</TableHead><TableHead>القيمة</TableHead></TableRow></TableHeader>
                <TableBody>
                  {topClients.map((c, i) => <TableRow key={i}><TableCell>{c.client}</TableCell><TableCell>{c.value.toLocaleString()} ر.س</TableCell></TableRow>)}
                  {!topClients.length && <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground py-6">لا توجد بيانات</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {isAgent && !isManagerView && (
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>تقدم الهدف الشهري</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm"><span>{myRevenueThisMonth.toLocaleString()} ر.س</span><span>{MONTHLY_TARGET.toLocaleString()} ر.س</span></div>
                <Progress value={Math.min((myRevenueThisMonth / MONTHLY_TARGET) * 100, 100)} />
                <p className="text-xs text-muted-foreground">{Math.round((myRevenueThisMonth / MONTHLY_TARGET) * 100)}% من الهدف</p>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>صفقاتي حسب المرحلة</CardTitle>
                <ExportButtons name="my_deals"
                  excel={() => exportToExcel("my_deals", [{ name: "Deals", rows: myDealsByStage }])}
                  pdf={() => exportToPDF("my_deals", "My Deals", [{ name: "By Stage", columns: ["Stage", "Count"], rows: myDealsByStage.map((d) => [d.name, d.value]) }])}
                />
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={myDealsByStage}>
                    <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip />
                    <Bar dataKey="value" fill="hsl(var(--primary))" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>الإيرادات: هذا الشهر مقابل السابق</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={[{ name: "الشهر السابق", value: myRevenueLastMonth }, { name: "هذا الشهر", value: myRevenueThisMonth }]}>
                    <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip />
                    <Bar dataKey="value" fill="hsl(var(--primary))" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {isFinance && !isManagerView && (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Card><CardHeader><CardTitle>إجمالي إيرادات هذا الشهر</CardTitle></CardHeader>
              <CardContent><p className="text-3xl font-bold text-primary">{financeRevenueThisMonth.toLocaleString()} ر.س</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>توزيع شروط الدفع</CardTitle>
                <ExportButtons name="payment_terms"
                  excel={() => exportToExcel("payment_terms", [{ name: "Terms", rows: paymentTerms }])}
                  pdf={() => exportToPDF("payment_terms", "Payment Terms", [{ name: "Terms", columns: ["Term", "Count"], rows: paymentTerms.map((t) => [t.name, t.value]) }])}
                />
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={paymentTerms} dataKey="value" nameKey="name" outerRadius={80} label>
                      {paymentTerms.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip /><Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>عروض الأسعار المقبولة بانتظار الفوترة</CardTitle>
              <ExportButtons name="pending_invoice"
                excel={() => exportToExcel("pending_invoice", [{ name: "Pending", rows: pendingInvoice.map((q) => ({ quote: q.quote_number, customer: customerName(q.customer_id), amount: q.total_amount })) }])}
                pdf={() => exportToPDF("pending_invoice", "Pending Invoice", [{ name: "Pending", columns: ["Quote", "Customer", "Amount"], rows: pendingInvoice.map((q) => [q.quote_number, customerName(q.customer_id), Number(q.total_amount || 0)]) }])}
              />
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>رقم العرض</TableHead><TableHead>العميل</TableHead><TableHead>المبلغ</TableHead><TableHead>الحالة</TableHead></TableRow></TableHeader>
                <TableBody>
                  {pendingInvoice.map((q) => (
                    <TableRow key={q.id}>
                      <TableCell className="font-mono">{q.quote_number}</TableCell>
                      <TableCell>{customerName(q.customer_id)}</TableCell>
                      <TableCell>{Number(q.total_amount || 0).toLocaleString()} {q.currency}</TableCell>
                      <TableCell><Badge variant="outline">بانتظار الفوترة</Badge></TableCell>
                    </TableRow>
                  ))}
                  {!pendingInvoice.length && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">لا توجد بيانات</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {isMarketing && !isManagerView && (
        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>توزيع مصادر العملاء المحتملين</CardTitle>
                <ExportButtons name="lead_sources"
                  excel={() => exportToExcel("lead_sources", [{ name: "Sources", rows: leadsBySource }])}
                  pdf={() => exportToPDF("lead_sources", "Lead Sources", [{ name: "Sources", columns: ["Source", "Total"], rows: leadsBySource.map((r) => [r.source, r.total]) }])}
                />
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={leadsBySource} dataKey="total" nameKey="source" outerRadius={100} label>
                      {leadsBySource.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip /><Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>قمع التحويل</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <FunnelChart>
                    <Tooltip />
                    <Funnel dataKey="value" data={[
                      { name: "محتملون", value: leads.length, fill: COLORS[0] },
                      { name: "مؤهلون", value: leads.filter((l) => l.status === "qualified").length, fill: COLORS[1] },
                      { name: "محولون", value: leads.filter((l) => l.status === "converted").length, fill: COLORS[2] },
                    ]}>
                      <LabelList position="right" fill="hsl(var(--foreground))" stroke="none" dataKey="name" />
                    </Funnel>
                  </FunnelChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>أداء الحملات (حسب المصدر)</CardTitle>
              <ExportButtons name="campaigns"
                excel={() => exportToExcel("campaigns", [{ name: "Campaigns", rows: leadsBySource }])}
                pdf={() => exportToPDF("campaigns", "Campaign Performance", [{ name: "Campaigns", columns: ["Source", "Total Leads", "Conversion %"], rows: leadsBySource.map((r) => [r.source, r.total, `${r.conversion}%`]) }])}
              />
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>المصدر</TableHead><TableHead>إجمالي العملاء</TableHead><TableHead>نسبة التحويل</TableHead></TableRow></TableHeader>
                <TableBody>
                  {leadsBySource.map((r, i) => <TableRow key={i}><TableCell>{r.source}</TableCell><TableCell>{r.total}</TableCell><TableCell>{r.conversion}%</TableCell></TableRow>)}
                  {!leadsBySource.length && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-6">لا توجد بيانات</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {!isManagerView && !isAgent && !isFinance && !isMarketing && (
        <Card><CardContent className="py-10 text-center text-muted-foreground">لا توجد تقارير متاحة لدورك الحالي.</CardContent></Card>
      )}
    </AppLayout>
  );
}
