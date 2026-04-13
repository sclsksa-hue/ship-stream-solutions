import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserPlus, Building2, Target, FileText, Phone, Mail, Calendar, DollarSign, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import StatusBadge from "@/components/StatusBadge";
import { useRole } from "@/lib/useRole";

interface Stats {
  leads: number; customers: number; opportunities: number; quotations: number;
  pipelineValue: number; dealsWon: number; dealsLost: number;
}

type PipelineBySalesperson = { name: string; value: number; count: number };

export default function Dashboard() {
  const { role, isAdmin, canManageSales, loading: roleLoading } = useRole();
  const [stats, setStats] = useState<Stats>({ leads: 0, customers: 0, opportunities: 0, quotations: 0, pipelineValue: 0, dealsWon: 0, dealsLost: 0 });
  const [pipelineByPerson, setPipelineByPerson] = useState<PipelineBySalesperson[]>([]);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [stageData, setStageData] = useState<{ name: string; value: number }[]>([]);
  const [upcomingTasks, setUpcomingTasks] = useState<any[]>([]);

  const stageLabels: Record<string, string> = {
    prospecting: "استكشاف",
    proposal: "عرض",
    negotiation: "تفاوض",
    won: "مكسب",
    lost: "مفقود",
  };

  useEffect(() => {
    async function load() {
      const [leads, customers, opportunities, quotations, activities, tasks] = await Promise.all([
        supabase.from("leads").select("id", { count: "exact", head: true }),
        supabase.from("customers").select("id", { count: "exact", head: true }),
        supabase.from("opportunities").select("id, estimated_value, assigned_to, stage"),
        supabase.from("quotations").select("id", { count: "exact", head: true }),
        supabase.from("activities").select("id, activity_type, notes, activity_date, leads(company_name), customers(company_name), opportunities(title)").order("activity_date", { ascending: false }).limit(10),
        supabase.from("tasks").select("id, description, due_date, status, assigned_to").eq("status", "pending").order("due_date", { ascending: true }).limit(8),
      ]);

      const opps = opportunities.data || [];
      const activeOpps = opps.filter(o => !["won", "lost"].includes(o.stage));
      const pipelineValue = activeOpps.reduce((sum, o) => sum + (Number(o.estimated_value) || 0), 0);
      const dealsWon = opps.filter(o => o.stage === "won").length;
      const dealsLost = opps.filter(o => o.stage === "lost").length;

      const stageCounts: Record<string, number> = {};
      opps.forEach(o => { stageCounts[o.stage] = (stageCounts[o.stage] || 0) + 1; });
      setStageData(Object.entries(stageCounts).map(([name, value]) => ({ name: stageLabels[name] || name, value })));

      setStats({
        leads: leads.count || 0, customers: customers.count || 0, opportunities: opps.length,
        quotations: quotations.count || 0, pipelineValue, dealsWon, dealsLost,
      });

      const profiles = await supabase.from("profiles").select("id, full_name");
      const profileMap = new Map((profiles.data || []).map(p => [p.id, p.full_name]));
      const byPerson = new Map<string, { value: number; count: number }>();
      activeOpps.forEach(o => {
        const name = profileMap.get(o.assigned_to || "") || "غير معيّن";
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

  const kpiCards = [
    { title: "العملاء المحتملون", value: stats.leads, icon: UserPlus, color: "text-info" },
    { title: "العملاء", value: stats.customers, icon: Building2, color: "text-accent" },
    { title: "قيمة خط المبيعات", value: `$${stats.pipelineValue.toLocaleString()}`, icon: Target, color: "text-warning" },
    { title: "صفقات ناجحة", value: stats.dealsWon, icon: TrendingUp, color: "text-success" },
  ];

  const actIcon = (type: string) => {
    if (type === "call") return <Phone className="h-4 w-4 text-info" />;
    if (type === "email") return <Mail className="h-4 w-4 text-warning" />;
    return <Calendar className="h-4 w-4 text-accent" />;
  };

  const actTypeLabel = (type: string) => {
    if (type === "call") return "مكالمة";
    if (type === "email") return "بريد إلكتروني";
    return "اجتماع";
  };

  const getRoleTitle = () => {
    switch (role) {
      case "admin": return "لوحة تحكم المدير";
      case "sales": return "لوحة تحكم المبيعات";
      case "operations": return "لوحة تحكم العمليات";
      case "viewer": return "لوحة العرض";
      default: return "لوحة التحكم";
    }
  };

  return (
    <AppLayout>
      <PageHeader title={getRoleTitle()} description="SCLS — نظام إدارة علاقات العملاء المتكامل" />

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 mb-8">
        {kpiCards.map(c => (
          <Card key={c.title} className="animate-fade-in group hover:shadow-md transition-all duration-200 border-border/60">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">{c.title}</CardTitle>
              <div className="rounded-lg p-2 bg-muted/60 group-hover:bg-muted transition-colors">
                <c.icon className={`h-4 w-4 sm:h-5 sm:w-5 ${c.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-display font-bold tracking-tight">{c.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="font-display">خط المبيعات حسب الموظف</CardTitle></CardHeader>
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
              ) : <p className="text-sm text-muted-foreground py-8 text-center">لا توجد بيانات</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="font-display">مراحل الفرص</CardTitle></CardHeader>
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
              ) : <p className="text-sm text-muted-foreground py-8 text-center">لا توجد بيانات</p>}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="font-display">آخر الأنشطة</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentActivities.map((a: any) => (
                  <div key={a.id} className="flex items-start gap-3 text-sm">
                    <div className="mt-0.5">{actIcon(a.activity_type)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{actTypeLabel(a.activity_type)}</span>
                        {a.leads?.company_name && <span className="text-muted-foreground">— {a.leads.company_name}</span>}
                        {a.customers?.company_name && <span className="text-muted-foreground">— {a.customers.company_name}</span>}
                      </div>
                      {a.notes && <p className="text-muted-foreground truncate">{a.notes}</p>}
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">{new Date(a.activity_date).toLocaleDateString("ar-SA")}</span>
                  </div>
                ))}
                {recentActivities.length === 0 && <p className="text-sm text-muted-foreground">لا توجد أنشطة بعد</p>}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="font-display">المهام القادمة</CardTitle></CardHeader>
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
                          {overdue ? "⚠ " : ""}{new Date(t.due_date).toLocaleDateString("ar-SA")}
                        </span>
                      )}
                    </div>
                  );
                })}
                {upcomingTasks.length === 0 && <p className="text-sm text-muted-foreground">لا توجد مهام معلقة</p>}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
