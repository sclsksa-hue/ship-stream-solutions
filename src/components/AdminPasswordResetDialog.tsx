import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Copy } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  userId: string | null;
  userEmail?: string | null;
  userName?: string | null;
}

export default function AdminPasswordResetDialog({ open, onOpenChange, userId, userEmail, userName }: Props) {
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [link, setLink] = useState<string | null>(null);

  const reset = (closing: boolean) => {
    setPw(""); setLink(null);
    if (closing) onOpenChange(false);
  };

  const setPassword = async () => {
    if (!userId) return;
    if (pw.length < 8 || !/\d/.test(pw) || !/[^A-Za-z0-9]/.test(pw)) {
      toast.error("كلمة المرور يجب أن تحتوي 8+ أحرف، رقم، ورمز خاص");
      return;
    }
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("admin-reset-password", {
      body: { user_id: userId, mode: "set", new_password: pw },
    });
    setBusy(false);
    if (error || (data as any)?.error) { toast.error((data as any)?.error || error?.message || "فشل"); return; }
    toast.success("تم تعيين كلمة المرور الجديدة");
    reset(true);
  };

  const sendLink = async () => {
    if (!userId) return;
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("admin-reset-password", {
      body: { user_id: userId, mode: "link" },
    });
    setBusy(false);
    if (error || (data as any)?.error) { toast.error((data as any)?.error || error?.message || "فشل"); return; }
    setLink((data as any)?.action_link || null);
    toast.success("تم إنشاء رابط الاستعادة");
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(true); else onOpenChange(v); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>إعادة تعيين كلمة مرور {userName || userEmail || "المستخدم"}</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="set">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="set">تعيين كلمة مرور</TabsTrigger>
            <TabsTrigger value="link">إرسال رابط</TabsTrigger>
          </TabsList>
          <TabsContent value="set" className="space-y-3 pt-3">
            <Label>كلمة المرور الجديدة</Label>
            <Input type="text" value={pw} onChange={(e) => setPw(e.target.value)} dir="ltr" placeholder="Min 8 chars, number, symbol" />
            <p className="text-xs text-muted-foreground">سيُسجَّل هذا الإجراء في سجل التدقيق. أبلغ الموظف بالكلمة بطريقة آمنة.</p>
            <Button onClick={setPassword} disabled={busy} className="w-full">
              {busy ? "جاري..." : "تعيين كلمة المرور"}
            </Button>
          </TabsContent>
          <TabsContent value="link" className="space-y-3 pt-3">
            <p className="text-sm text-muted-foreground">سيتم إنشاء رابط استعادة صالح لمرة واحدة. يمكنك نسخه وإرساله للموظف.</p>
            <Button onClick={sendLink} disabled={busy} className="w-full">
              {busy ? "جاري..." : "إنشاء رابط استعادة"}
            </Button>
            {link && (
              <div className="rounded-md border bg-muted/40 p-2">
                <div className="flex items-start gap-2">
                  <code className="text-[11px] break-all flex-1" dir="ltr">{link}</code>
                  <Button size="icon" variant="ghost" onClick={() => { navigator.clipboard.writeText(link); toast.success("تم النسخ"); }}>
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
