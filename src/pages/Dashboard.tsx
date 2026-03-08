import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserPlus, Building2, Target, FileText } from "lucide-react";

interface Stats {
  leads: number;
  customers: number;
  opportunities: number;
  quotations: number;
  pipelineValue: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats>({ leads: 0, customers: 0, opportunities: 0, quotations: 0, pipelineValue: 0 });

  useEffect(() => {
    async function load() {
      const [leads, customers, opportunities, quotations] = await Promise.all([
        supabase.from("leads").select("id", { count: "exact", head: true }),
        supabase.from("customers").select("id", { count: "exact", head: true }),
        supabase.from("opportunities").select("id, estimated_value"),
        supabase.from("quotations").select("id", { count: "exact", head: true }),
      ]);
      const pipelineValue = (opportunities.data || []).reduce(
        (sum, o) => sum + (Number(o.estimated_value) || 0), 0
      );
      setStats({
        leads: leads.count || 0,
        customers: customers.count || 0,
        opportunities: opportunities.data?.length || 0,
        quotations: quotations.count || 0,
        pipelineValue,
      });
    }
    load();
  }, []);

  const cards = [
    { title: "Leads", value: stats.leads, icon: UserPlus, color: "text-info" },
    { title: "Customers", value: stats.customers, icon: Building2, color: "text-accent" },
    { title: "Opportunities", value: stats.opportunities, icon: Target, color: "text-warning" },
    { title: "Quotations", value: stats.quotations, icon: FileText, color: "text-primary" },
  ];

  return (
    <AppLayout>
      <PageHeader title="Dashboard" description="SCLS CRM Overview" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.title} className="animate-fade-in">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{c.title}</CardTitle>
              <c.icon className={`h-5 w-5 ${c.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-display font-bold">{c.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-6 animate-fade-in">
        <CardHeader>
          <CardTitle className="font-display">Pipeline Value</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-display font-bold text-primary">
            ${stats.pipelineValue.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </div>
          <p className="text-sm text-muted-foreground mt-1">Total estimated opportunity value</p>
        </CardContent>
      </Card>
    </AppLayout>
  );
}
