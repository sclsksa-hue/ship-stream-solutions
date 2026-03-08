import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Opportunity = {
  id: string;
  title: string;
  stage: string;
  estimated_value: number | null;
  currency: string;
  customers?: { company_name: string };
};

const stages = ["prospecting", "proposal", "negotiation", "won", "lost"];
const stageColors: Record<string, string> = {
  prospecting: "border-l-info",
  proposal: "border-l-warning",
  negotiation: "border-l-accent",
  won: "border-l-success",
  lost: "border-l-destructive",
};

export default function Pipeline() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);

  useEffect(() => {
    supabase.from("opportunities").select("*, customers(company_name)").order("created_at", { ascending: false })
      .then(({ data }) => { if (data) setOpportunities(data as any); });
  }, []);

  const grouped = stages.map((stage) => ({
    stage,
    items: opportunities.filter((o) => o.stage === stage),
    total: opportunities.filter((o) => o.stage === stage).reduce((s, o) => s + (Number(o.estimated_value) || 0), 0),
  }));

  return (
    <AppLayout>
      <PageHeader title="Sales Pipeline" description="Visual overview of your opportunities" />
      <div className="grid grid-cols-5 gap-4">
        {grouped.map((col) => (
          <div key={col.stage} className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-sm font-semibold capitalize">{col.stage}</h3>
              <span className="text-xs text-muted-foreground">{col.items.length}</span>
            </div>
            <p className="text-xs text-muted-foreground mb-2">${col.total.toLocaleString()}</p>
            <div className="space-y-2">
              {col.items.map((o) => (
                <Card key={o.id} className={`border-l-4 ${stageColors[col.stage]} animate-fade-in`}>
                  <CardContent className="p-3">
                    <p className="text-sm font-medium leading-tight">{o.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">{o.customers?.company_name}</p>
                    {o.estimated_value && (
                      <p className="text-xs font-semibold mt-2">${Number(o.estimated_value).toLocaleString()}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
              {col.items.length === 0 && (
                <div className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
                  No opportunities
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </AppLayout>
  );
}
