import { useEffect, useState } from "react";
import { Bell, BellOff, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { getPushStatus, isPushSupported, subscribeToPush, unsubscribeFromPush } from "@/lib/pushNotifications";

export default function PushNotificationSettings() {
  const [status, setStatus] = useState<"granted" | "denied" | "default" | "unsupported" | "loading">("loading");
  const [busy, setBusy] = useState(false);

  useEffect(() => { getPushStatus().then(setStatus); }, []);

  const handleEnable = async () => {
    setBusy(true);
    try {
      await subscribeToPush();
      setStatus("granted");
      toast.success("تم تفعيل إشعارات المتصفح بنجاح");
    } catch (e: any) {
      toast.error(e.message || "فشل التفعيل");
      setStatus(await getPushStatus());
    } finally { setBusy(false); }
  };

  const handleDisable = async () => {
    setBusy(true);
    try {
      await unsubscribeFromPush();
      setStatus("default");
      toast.success("تم إلغاء الاشتراك");
    } catch (e: any) {
      toast.error(e.message || "فشل الإلغاء");
    } finally { setBusy(false); }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" />
          <CardTitle className="text-base">إشعارات المتصفح (Push)</CardTitle>
        </div>
        <CardDescription>
          استقبل إشعارات فورية عن العملاء المحتملين، عروض الأسعار، الشحنات والمهام — حتى عند إغلاق التطبيق.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {status === "loading" && <div className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> جارٍ التحقق...</div>}

        {status === "unsupported" && (
          <div className="flex items-start gap-2 text-sm text-amber-700 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-300 p-3 rounded-md">
            <AlertTriangle className="h-4 w-4 mt-0.5" />
            <span>متصفحك لا يدعم إشعارات Push. جرّب Chrome أو Edge أو Firefox.</span>
          </div>
        )}

        {status === "denied" && (
          <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-md">
            <AlertTriangle className="h-4 w-4 mt-0.5" />
            <span>الإشعارات محظورة. فعّلها يدوياً من إعدادات الموقع في المتصفح ثم أعد المحاولة.</span>
          </div>
        )}

        {status === "default" && (
          <Button onClick={handleEnable} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : <Bell className="h-4 w-4 ml-2" />}
            تفعيل الإشعارات
          </Button>
        )}

        {status === "granted" && (
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
              <Bell className="h-4 w-4" /> الإشعارات مفعّلة على هذا الجهاز
            </div>
            <Button variant="outline" size="sm" onClick={handleDisable} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <><BellOff className="h-4 w-4 ml-2" /> إلغاء</>}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
