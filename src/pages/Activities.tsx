import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import AppLayout from "@/components/AppLayout";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Phone, Mail, Calendar } from "lucide-react";
import ConfirmDeleteDialog from "@/components/ConfirmDeleteDialog";

type Activity = {
  id: string; activity_type: string; notes: string | null; activity_date: string;
  assigned_to: string | null; customer_id: string | null;
  customers?: { company_name: string } | null;
};

const typeLabels: Record<string, string> = { call: "مكالمة", meeting: "اجتماع", email: "بريد إلكتروني" };

export default function Activities() {
  const [items, setItems] = useState<Activity[]>([]);
  const [customers, setCustomers] = useState<{ id: string; company_name: string }[]>([]);
  const [open, setOpen] = useState(false);
  const [editAct, setEditAct] = useState<Activity | null>(null);
  const [form, setForm] = useState({ activity_type: "call", notes: "", activity_date: new Date().toISOString().slice(0, 16), customer_id: "" });
  const { user } = useAuth();

  const load = async () => {
    const { data } = await supabase.from("activities").select("id, activity_type, notes, activity_date, assigned_to, customer_id, customers(company_name)").order("activity_date", { ascending: false });
    if (data) setItems(data as any);
    const { data: c } = await supabase.from("customers").select("id, company_name").order("company_name");
    if (c) setCustomers(c);
  };

  useEffect(() => { load(); }, []);

  const resetForm = () => setForm({ activity_type: "call", notes: "", activity_date: new Date().toISOString().slice(0, 16), customer_id: "" });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { activity_type: form.activity_type as any, notes: form.notes || null, activity_date: form.activity_date, customer_id: form.customer_id || null, assigned_to: user?.id };
    const { error } = editAct ? await supabase.from("activities").update(payload).eq("id", editAct.id) : await supabase.from("activities").insert(payload);
    if (error) toast.error(error.message);
    else { toast.success(editAct ? "تم تحديث النشاط" : "تم تسجيل النشاط"); setOpen(false); setEditAct(null); resetForm(); load(); }
  };

  const deleteAct = async (id: string) => {
    const { error } = await supabase.from("activities").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("تم حذف النشاط"); load(); }
  };

  const openEdit = (a: Activity) => {
    setEditAct(a);
    setForm({ activity_type: a.activity_type, notes: a.notes || "", activity_date: a.activity_date.slice(0, 16), customer_id: a.customer_id || "" });
    setOpen(true);
  };

  const actIcon = (type: string) => {
    if (type === "call") return <Phone className="h-4 w-4 text-info" />;
    if (type === "email") return <Mail className="h-4 w-4 text-warning" />;
    return <Calendar className="h-4 w-4 text-accent" />;
  };

  return (
    <AppLayout>
      <PageHeader title="الأنشطة" description="تسجيل المكالمات والاجتماعات والبريد الإلكتروني" action={
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditAct(null); resetForm(); } }}>
          <DialogTrigger asChild><Button><Plus className="ml-2 h-4 w-4" />تسجيل نشاط</Button></DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle className="font-display">{editAct ? "تعديل النشاط" : "تسجيل نشاط"}</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>النوع *</Label>
                  <Select value={form.activity_type} onValueChange={(v) => setForm({ ...form, activity_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(typeLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>التاريخ/الوقت *</Label>
                  <Input type="datetime-local" value={form.activity_date} onChange={(e) => setForm({ ...form, activity_date: e.target.value })} required dir="ltr" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>العميل</Label>
                <Select value={form.customer_id} onValueChange={(v) => setForm({ ...form, customer_id: v })}>
                  <SelectTrigger><SelectValue placeholder="اختر العميل (اختياري)" /></SelectTrigger>
                  <SelectContent>{customers.map(c => <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>ملاحظات</Label>
                <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="ملاحظات النشاط..." />
              </div>
              <Button type="submit" className="w-full">{editAct ? "تحديث النشاط" : "تسجيل النشاط"}</Button>
            </form>
          </DialogContent>
        </Dialog>
      } />
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>النوع</TableHead><TableHead>العميل</TableHead><TableHead>ملاحظات</TableHead>
              <TableHead>التاريخ</TableHead><TableHead className="text-left">إجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">لا توجد أنشطة بعد</TableCell></TableRow>
            ) : (
              items.map((a) => (
                <TableRow key={a.id} className="animate-fade-in">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {actIcon(a.activity_type)}
                      <span className="font-medium">{typeLabels[a.activity_type] || a.activity_type}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{a.customers?.company_name || "—"}</TableCell>
                  <TableCell className="text-muted-foreground max-w-xs truncate">{a.notes || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{new Date(a.activity_date).toLocaleString("ar-SA")}</TableCell>
                  <TableCell className="text-left">
                    <div className="flex items-center justify-start gap-1">
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(a)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <ConfirmDeleteDialog onConfirm={() => deleteAct(a.id)} trigger={<Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" ><Trash2 className="h-3.5 w-3.5" /></Button>} />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </AppLayout>
  );
}
