import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Search, Send } from "lucide-react";
import { toast } from "sonner";
import sclsLogo from "@/assets/scls-logo.png";

export default function CustomerPortal() {
  const [quoteForm, setQuoteForm] = useState({ origin: "", destination: "", shipment_type: "fcl", commodity: "", notes: "" });

  const handleQuoteRequest = async () => {
    if (!quoteForm.origin || !quoteForm.destination) {
      toast.error("المصدر والوجهة مطلوبان");
      return;
    }
    try {
      const { error } = await supabase.from("tasks").insert({
        description: `طلب عرض سعر: ${quoteForm.shipment_type.toUpperCase()} من ${quoteForm.origin} إلى ${quoteForm.destination}. البضاعة: ${quoteForm.commodity || "غير محدد"}. ملاحظات: ${quoteForm.notes || "لا يوجد"}`,
        status: "pending",
      });
      if (error) throw error;
      toast.success("تم إرسال طلب عرض السعر بنجاح");
      setQuoteForm({ origin: "", destination: "", shipment_type: "fcl", commodity: "", notes: "" });
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center space-y-3">
          <img src={sclsLogo} alt="SCLS Logo" className="h-16 w-16 mx-auto rounded-xl object-contain" />
          <h1 className="font-display text-4xl font-bold tracking-tight">بوابة العملاء — SCLS</h1>
          <p className="text-muted-foreground">طلب عروض أسعار وإدارة خدماتك اللوجستية</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              طلب عرض سعر
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>المصدر *</Label>
                <Input placeholder="مثال: شنغهاي، الصين" value={quoteForm.origin} onChange={(e) => setQuoteForm({ ...quoteForm, origin: e.target.value })} />
              </div>
              <div>
                <Label>الوجهة *</Label>
                <Input placeholder="مثال: جدة، السعودية" value={quoteForm.destination} onChange={(e) => setQuoteForm({ ...quoteForm, destination: e.target.value })} />
              </div>
              <div>
                <Label>نوع الشحنة</Label>
                <Select value={quoteForm.shipment_type} onValueChange={(v) => setQuoteForm({ ...quoteForm, shipment_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fcl">FCL - حاوية كاملة</SelectItem>
                    <SelectItem value="lcl">LCL - حمولة جزئية</SelectItem>
                    <SelectItem value="air">جوي</SelectItem>
                    <SelectItem value="land">بري</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>البضاعة</Label>
                <Input placeholder="مثال: إلكترونيات" value={quoteForm.commodity} onChange={(e) => setQuoteForm({ ...quoteForm, commodity: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>ملاحظات إضافية</Label>
              <Textarea placeholder="أي تفاصيل إضافية..." value={quoteForm.notes} onChange={(e) => setQuoteForm({ ...quoteForm, notes: e.target.value })} />
            </div>
            <Button onClick={handleQuoteRequest} className="w-full">
              <Send className="ml-2 h-4 w-4" />إرسال طلب عرض السعر
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
