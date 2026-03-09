import AppLayout from "@/components/AppLayout";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mail, MessageSquare, Calculator, Ship, Webhook, Database, Lock, Zap } from "lucide-react";

const integrations = [
  {
    name: "Email (SMTP / SendGrid)",
    icon: Mail,
    status: "ready",
    description: "Send automated emails for quotations, shipment updates, and notifications. Edge function already configured.",
    endpoint: "/functions/v1/send-email",
  },
  {
    name: "WhatsApp Business API",
    icon: MessageSquare,
    status: "planned",
    description: "Send shipment tracking updates, delivery confirmations, and customer notifications via WhatsApp.",
    endpoint: "/functions/v1/whatsapp-webhook",
  },
  {
    name: "Accounting Software",
    icon: Calculator,
    status: "planned",
    description: "Sync invoices, payments, and financial data with QuickBooks, Xero, or SAP. Quotation → Invoice automation.",
    endpoint: "/functions/v1/accounting-sync",
  },
  {
    name: "Freight Management",
    icon: Ship,
    status: "planned",
    description: "Connect to CargoWise, Descartes, or other freight platforms for real-time tracking and rate management.",
    endpoint: "/functions/v1/freight-webhook",
  },
];

const statusColors: Record<string, string> = {
  ready: "bg-green-500/10 text-green-600",
  planned: "bg-amber-500/10 text-amber-600",
};

export default function Integrations() {
  return (
    <AppLayout>
      <PageHeader
        title="Integrations"
        description="Connect SCLS with external services — architecture ready for plug-and-play integration"
      />

      {/* Architecture Overview */}
      <Card className="mb-8 border-primary/20 bg-primary/5">
        <CardContent className="pt-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex items-start gap-3">
              <div className="rounded-lg p-2 bg-primary/10"><Webhook className="h-5 w-5 text-primary" /></div>
              <div><p className="font-semibold text-sm">Webhook-First</p><p className="text-xs text-muted-foreground">All integrations use serverless edge functions as webhook endpoints</p></div>
            </div>
            <div className="flex items-start gap-3">
              <div className="rounded-lg p-2 bg-primary/10"><Database className="h-5 w-5 text-primary" /></div>
              <div><p className="font-semibold text-sm">Event-Driven</p><p className="text-xs text-muted-foreground">Database triggers push events to integration endpoints automatically</p></div>
            </div>
            <div className="flex items-start gap-3">
              <div className="rounded-lg p-2 bg-primary/10"><Lock className="h-5 w-5 text-primary" /></div>
              <div><p className="font-semibold text-sm">Secure Secrets</p><p className="text-xs text-muted-foreground">API keys stored as encrypted environment variables</p></div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Integration Cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        {integrations.map((integration) => (
          <Card key={integration.name} className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-start gap-4 space-y-0">
              <div className="rounded-lg p-2.5 bg-muted">
                <integration.icon className="h-5 w-5 text-foreground" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <CardTitle className="text-base">{integration.name}</CardTitle>
                  <Badge className={statusColors[integration.status]}>
                    {integration.status === "ready" ? "Ready" : "Planned"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{integration.description}</p>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-xs">
                <Zap className="h-3 w-3 text-muted-foreground" />
                <code className="bg-muted px-2 py-0.5 rounded text-muted-foreground">{integration.endpoint}</code>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* API Architecture */}
      <Card className="mt-8">
        <CardHeader><CardTitle>API Architecture</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm">
            <div className="grid gap-2">
              <p className="font-medium">Inbound Webhooks</p>
              <p className="text-muted-foreground">External services send data to edge function endpoints. Each webhook validates signatures, processes payloads, and updates the database.</p>
            </div>
            <div className="grid gap-2">
              <p className="font-medium">Outbound Events</p>
              <p className="text-muted-foreground">Database triggers fire on key events (new shipment, status change, quotation accepted) and push data to configured integration endpoints.</p>
            </div>
            <div className="grid gap-2">
              <p className="font-medium">REST API</p>
              <p className="text-muted-foreground">All tables are accessible via auto-generated REST API with row-level security. External systems can read/write data using API keys.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </AppLayout>
  );
}
