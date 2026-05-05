import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import AppLayout from "@/components/AppLayout";
import PageHeader from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ShieldCheck } from "lucide-react";

function validateStrength(pw: string): string | null {
  if (pw.length < 8) return "8 أحرف على الأقل";
  if (!/\d/.test(pw)) return "يجب أن تحتوي على رقم";
  if (!/[^A-Za-z0-9]/.test(pw)) return "يجب أن تحتوي على رمز خاص";
  return null;
}

export default function SecuritySettings() {
  const { user, signOut } = useAuth();
  const [oldPw, setOldPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!user?.email) return;
    if (newPw !== confirmPw) { toast.error("كلمتا المرور غير متطابقتين"); return; }
    const strengthErr = validateStrength(newPw);
    if (strengthErr) { toast.error(strengthErr); return; }

    setBusy(true);
    // Re-authenticate to verify old password
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: oldPw,
    });
    if (signInErr) {
      toast.error("كلمة المرور الحالية غير صحيحة");
      setBusy(false);
      return;
    }

    const { error: updErr } = await supabase.auth.updateUser({ password: newPw });
    if (updErr) { toast.error(updErr.message); setBusy(false); return; }

    await supabase.from("audit_logs" as any).insert({
      user_id: user.id,
      user_email: user.email,
      action: "password_change",
      entity_type: "auth",
      entity_id: user.id,
    });

    toast.success("تم تغيير كلمة المرور. الرجاء تسجيل الدخول مجدداً");
    setBusy(false);
    setTimeout(() => signOut(), 1500);
  };

  return (
    <AppLayout>
      <PageHeader title="الأمان وكلمة المرور" description="إدارة كلمة المرور الخاصة بك" />
      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            تغيير كلمة المرور
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>كلمة المرور الحالية</Label>
            <Input type="password" value={oldPw} onChange={(e) => setOldPw(e.target.value)} dir="ltr" />
          </div>
          <div>
            <Label>كلمة المرور الجديدة</Label>
            <Input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} dir="ltr" />
            <p className="text-xs text-muted-foreground mt-1">8+ أحرف، رقم، ورمز خاص</p>
          </div>
          <div>
            <Label>تأكيد كلمة المرور</Label>
            <Input type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} dir="ltr" />
          </div>
          <Button onClick={submit} disabled={busy || !oldPw || !newPw} className="w-full">
            {busy ? "جاري التحديث..." : "تحديث كلمة المرور"}
          </Button>
        </CardContent>
      </Card>
    </AppLayout>
  );
}
