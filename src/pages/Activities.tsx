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

type Activity = {
  id: string;
  activity_type: string;
  notes: string | null;
  activity_date: string;
  assigned_to: string | null;
  lead_id: string | null;
  customer_id: string | null;
  opportunity_id: string | null;
  leads?: { company_name: string } | null;
  customers?: { company_name: string } | null;
  opportunities?: { title: string } | null;
};

export default function Activities() {
  const [items, setItems] = useState<Activity[]>([]);
  const [leads, setLeads] = useState<{ id: string; company_name: string }[]>([]);
  const [customers, setCustomers] = useState<{ id: string; company_name: string }[]>([]);
  const [opportunities, setOpportunities] = useState<{ id: string; title: string }[]>([]);
  const [open, setOpen] = useState(false);
  const [editAct, setEditAct] = useState<Activity | null>(null);
  const [form, setForm] = useState({ activity_type: "call", notes: "", activity_date: new Date().toISOString().slice(0, 16), lead_id: "", customer_id: "", opportunity_id: "" });
  const { user } = useAuth();

  const load = async () => {
    const { data } = await supabase.from("activities")
      .select("*, leads(company_name), customers(company_name), opportunities(title)")
      .order("activity_date", { ascending: false });
    if (data) setItems(data as any);
    const [{ data: l }, { data: c }, { data: o }] = await Promise.all([
      supabase.from("leads").select("id, company_name").order("company_name"),
      supabase.from("customers").select("id, company_name").order("company_name"),
      supabase.from("opportunities").select("id, title").order("title"),
    ]);
    if (l) setLeads(l);
    if (c) setCustomers(c);
    if (o) setOpportunities(o);
  };

  useEffect(() => { load(); }, []);

  const resetForm = () => setForm({ activity_type: "call", notes: "", activity_date: new Date().toISOString().slice(0, 16), lead_id: "", customer_id: "", opportunity_id: "" });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: any = {
      activity_type: form.activity_type,
      notes: form.notes || null,
      activity_date: form.activity_date,
      lead_id: form.lead_id || null,
      customer_id: form.customer_id || null,
      opportunity_id: form.opportunity_id || null,
      assigned_to: user?.id,
    };
    const { error } = editAct
      ? await supabase.from("activities").update(payload).eq("id", editAct.id)
      : await supabase.from("activities").insert(payload);
    if (error) toast.error(error.message);
    else {
      toast.success(editAct ? "Activity updated" : "Activity created");
      setOpen(false);
      setEditAct(null);
      resetForm();
      load();
    }
  };

  const deleteAct = async (id: string) => {
    const { error } = await supabase.from("activities").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Activity deleted"); load(); }
  };

  const openEdit = (a: Activity) => {
    setEditAct(a);
    setForm({
      activity_type: a.activity_type,
      notes: a.notes || "",
      activity_date: a.activity_date.slice(0, 16),
      lead_id: a.lead_id || "",
      customer_id: a.customer_id || "",
      opportunity_id: a.opportunity_id || "",
    });
    setOpen(true);
  };

  const actIcon = (type: string) => {
    if (type === "call") return <Phone className="h-4 w-4 text-info" />;
    if (type === "email") return <Mail className="h-4 w-4 text-warning" />;
    return <Calendar className="h-4 w-4 text-accent" />;
  };

  const linkedTo = (a: Activity) => {
    if (a.leads?.company_name) return `Lead: ${a.leads.company_name}`;
    if (a.customers?.company_name) return `Customer: ${a.customers.company_name}`;
    if (a.opportunities?.title) return `Opp: ${a.opportunities.title}`;
    return "—";
  };

  return (
    <AppLayout>
      <PageHeader
        title="Activities"
        description="Log calls, meetings, and emails"
        action={
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditAct(null); resetForm(); } }}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" />Log Activity</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle className="font-display">{editAct ? "Edit Activity" : "Log Activity"}</DialogTitle></DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Type *</Label>
                    <Select value={form.activity_type} onValueChange={(v) => setForm({ ...form, activity_type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["call", "meeting", "email"].map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Date/Time *</Label>
                    <Input type="datetime-local" value={form.activity_date} onChange={(e) => setForm({ ...form, activity_date: e.target.value })} required />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Lead</Label>
                    <Select value={form.lead_id} onValueChange={(v) => setForm({ ...form, lead_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                      <SelectContent>
                        {leads.map(l => <SelectItem key={l.id} value={l.id}>{l.company_name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Customer</Label>
                    <Select value={form.customer_id} onValueChange={(v) => setForm({ ...form, customer_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                      <SelectContent>
                        {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Opportunity</Label>
                    <Select value={form.opportunity_id} onValueChange={(v) => setForm({ ...form, opportunity_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                      <SelectContent>
                        {opportunities.map(o => <SelectItem key={o.id} value={o.id}>{o.title}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                </div>
                <Button type="submit" className="w-full">{editAct ? "Update Activity" : "Log Activity"}</Button>
              </form>
            </DialogContent>
          </Dialog>
        }
      />
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Linked To</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No activities yet</TableCell></TableRow>
            ) : (
              items.map((a) => (
                <TableRow key={a.id} className="animate-fade-in">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {actIcon(a.activity_type)}
                      <span className="capitalize font-medium">{a.activity_type}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{linkedTo(a)}</TableCell>
                  <TableCell className="text-muted-foreground max-w-xs truncate">{a.notes || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{new Date(a.activity_date).toLocaleString()}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(a)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => deleteAct(a.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
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
