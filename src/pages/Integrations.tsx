import AppLayout from "@/components/AppLayout";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mail, MessageSquare, Calculator, Webhook, Database, Lock, Zap } from "lucide-react";

const integrations = [
  {
    name: "البريد الإلكتروني (SMTP / SendGrid)",
    icon: Mail,
    status: "ready",
    description: "إرسال بريد إلكتروني تلقائي لعروض الأسعار والتحديثات والإشعارات.",
    endpoint: "/functions/v1/send-email",
  },
  {
    name: "واتساب للأعمال",
    icon: MessageSquare,
    status: "planned",
    description: "إرسال تحديثات وإشعارات العملاء عبر واتساب.",
    endpoint: "/functions/v1/whatsapp-webhook",
  },
  {
    name: "برامج المحاسبة",
    icon: Calculator,
    status: "planned",
    description: "مزامنة الفواتير والمدفوعات مع QuickBooks أو Xero أو SAP.",
    endpoint: "/functions/v1/accounting-sync",
  },
];

const statusColors: Record<string, string> = { ready: "bg-green-500/10 text-green-600", planned: "bg-amber-500/10 text-amber-600" };
const statusLabels: Record<string, string> = { ready: "جاهز", planned: "مخطط" };

export default function Integrations() {
  return (
    <AppLayout>
      <PageHeader title="التكاملات" description="ربط SCLS بالخدمات الخارجية" />

      <Card className="mb-8 border-primary/20 bg-primary/5">
        <CardContent className="pt-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex items-start gap-3">
              <div className="rounded-lg p-2 bg-primary/10"><Webhook className="h-5 w-5 text-primary" /></div>
              <div><p className="font-semibold text-sm">Webhook أولاً</p><p className="text-xs text-muted-foreground">جميع التكاملات تستخدم وظائف serverless كنقاط نهاية</p></div>
            </div>
            <div className="flex items-start gap-3">
              <div className="rounded-lg p-2 bg-primary/10"><Database className="h-5 w-5 text-primary" /></div>
              <div><p className="font-semibold text-sm">مبني على الأحداث</p><p className="text-xs text-muted-foreground">محفزات قاعدة البيانات تدفع الأحداث تلقائياً</p></div>
            </div>
            <div className="flex items-start gap-3">
              <div className="rounded-lg p-2 bg-primary/10"><Lock className="h-5 w-5 text-primary" /></div>
              <div><p className="font-semibold text-sm">مفاتيح آمنة</p><p className="text-xs text-muted-foreground">مفاتيح API مخزنة كمتغيرات بيئة مشفرة</p></div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        {integrations.map((integration) => (
          <Card key={integration.name} className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-start gap-4 space-y-0">
              <div className="rounded-lg p-2.5 bg-muted"><integration.icon className="h-5 w-5 text-foreground" /></div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <CardTitle className="text-base">{integration.name}</CardTitle>
                  <Badge className={statusColors[integration.status]}>{statusLabels[integration.status]}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{integration.description}</p>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-xs">
                <Zap className="h-3 w-3 text-muted-foreground" />
                <code className="bg-muted px-2 py-0.5 rounded text-muted-foreground" dir="ltr">{integration.endpoint}</code>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </AppLayout>
  );
}
