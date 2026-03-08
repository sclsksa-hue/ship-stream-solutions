import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserPlus, Building2, Target, FileText, Phone, Mail, Calendar, Ship, Truck, PackageCheck } from "lucide-react";

interface Stats {
  leads: number;
  customers: number;
  opportunities: number;
  quotations: number;
  pipelineValue: number;
  totalShipments: number;
  inTransit: number;
  delivered: number;
}

type PipelineBySalesperson = { name: string; value: number; count: number };
type RecentActivity = {
  id: string; activity_type: string; notes: string | null; activity_date: string;
  leads?: { company_name: string } | null;
  customers?: { company_name: string } | null;
  opportunities?: { title: string } | null;
};

export default function Dashboard() {
  const [stats, setStats] = useState<Stats>({ leads: 0, customers: 0, opportunities: 0, quotations: 0, pipelineValue: 0, totalShipments: 0, inTransit: 0, delivered: 0 });
  const [pipelineByPerson, setPipelineByPerson] = useState<PipelineBySalesperson[]>([]);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);

  useEffect(() => {
    async function load() {
      const [leads, customers, opportunities, quotations, activities, shipments] = await Promise.all([
        supabase.from("leads").select("id", { count: "exact", head: true }),
        supabase.from("customers").select("id", { count: "exact", head: true }),
        supabase.from("opportunities").select("id, estimated_value, assigned_to, stage"),
        supabase.from("quotations").select("id", { count: "exact", head: true }),
        supabase.from("activities")
          .select("id, activity_type, notes, activity_date, leads(company_name), customers(company_name), opportunities(title)")
          .order("activity_date", { ascending: false }).limit(10),
        supabase.from("shipments").select("id, status"),
      ]);

      const opps = opportunities.data || [];
      const activeOpps = opps.filter(o => !["won", "lost"].includes((o as any).stage));
      const pipelineValue = activeOpps.reduce((sum, o) => sum + (Number(o.estimated_value) || 0), 0);

      const ships = shipments.data || [];
      setStats({
        leads: leads.count || 0,
        customers: customers.count || 0,
        opportunities: opps.length,
        quotations: quotations.count || 0,
        pipelineValue,
        totalShipments: ships.length,
        inTransit: ships.filter(s => ["in_transit", "at_port", "customs"].includes(s.status)).length,
        delivered: ships.filter(s => s.status === "delivered").length,
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
    }
    load();
  }, []);

  const crmCards = [
    { title: "Leads", value: stats.leads, icon: UserPlus, color: "text-info" },
    { title: "Customers", value: stats.customers, icon: Building2, color: "text-accent" },
    { title: "Opportunities", value: stats.opportunities, icon: Target, color: "text-warning" },
    { title: "Quotations", value: stats.quotations, icon: FileText, color: "text-primary" },
  ];

  const tmsCards = [
    { title: "Total Shipments", value: stats.totalShipments, icon: Ship, color: "text-primary" },
    { title: "In Transit", value: stats.inTransit, icon: Truck, color: "text-warning" },
    { title: "Delivered", value: stats.delivered, icon: PackageCheck, color: "text-success" },
  ];

  const actIcon = (type: string) => {
    if (type === "call") return <Phone className="h-4 w-4 text-info" />;
    if (type === "email") return <Mail className="h-4 w-4 text-warning" />;
    return <Calendar className="h-4 w-4 text-accent" />;
  };

  const actLinked = (a: RecentActivity) => {
    if (a.leads?.company_name) return a.leads.company_name;
    if (a.customers?.company_name) return a.customers.company_name;
    if (a.opportunities?.title) return a.opportunities.title;
    return "";
  };

  return (
    <AppLayout>
      <PageHeader title="Dashboard" description="SCLS CRM & TMS Overview" />

      {/* CRM KPIs */}
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">CRM</p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        {crmCards.map(c => (
          <Card key={c.title} className="animate-fade-in">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{c.title}</CardTitle>
              <c.icon className={`h-5 w-5 ${c.color}`} />
            </CardHeader>
            <CardContent><div className="text-3xl font-display font-bold">{c.value}</div></CardContent>
          </Card>
        ))}
      </div>

      {/* TMS KPIs */}
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">TMS</p>
      <div className="grid gap-4 sm:grid-cols-3 mb-6">
        {tmsCards.map(c => (
          <Card key={c.title} className="animate-fade-in">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{c.title}</CardTitle>
              <c.icon className={`h-5 w-5 ${c.color}`} />
            </CardHeader>
            <CardContent><div className="text-3xl font-display font-bold">{c.value}</div></CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Pipeline Value */}
        <Card className="animate-fade-in">
          <CardHeader><CardTitle className="font-display">Pipeline Value by Salesperson</CardTitle></CardHeader>
          <CardContent>
            <div className="text-3xl font-display font-bold text-primary mb-4">
              ${stats.pipelineValue.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </div>
            <div className="space-y-3">
              {pipelineByPerson.map(p => {
                const pct = stats.pipelineValue > 0 ? (p.value / stats.pipelineValue) * 100 : 0;
                return (
                  <div key={p.name}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="font-medium">{p.name}</span>
                      <span className="text-muted-foreground">${p.value.toLocaleString()} ({p.count})</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
              {pipelineByPerson.length === 0 && <p className="text-sm text-muted-foreground">No active pipeline data</p>}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activities */}
        <Card className="animate-fade-in">
          <CardHeader><CardTitle className="font-display">Recent Activities</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentActivities.map(a => (
                <div key={a.id} className="flex items-start gap-3 text-sm">
                  <div className="mt-0.5">{actIcon(a.activity_type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium capitalize">{a.activity_type}</span>
                      {actLinked(a) && <span className="text-muted-foreground">— {actLinked(a)}</span>}
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
      </div>
    </AppLayout>
  );
}
