import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import AppLayout from "@/components/AppLayout";
import PageHeader from "@/components/PageHeader";
import StatusBadge from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";

type TaskItem = {
  id: string;
  description: string;
  due_date: string | null;
  status: string;
  assigned_to: string | null;
  lead_id: string | null;
  customer_id: string | null;
  opportunity_id: string | null;
  leads?: { company_name: string } | null;
  customers?: { company_name: string } | null;
  opportunities?: { title: string } | null;
};

const taskStatuses = ["pending", "in_progress", "completed", "cancelled"];

export default function Tasks() {
  const [items, setItems] = useState<TaskItem[]>([]);
  const [leads, setLeads] = useState<{ id: string; company_name: string }[]>([]);
  const [customers, setCustomers] = useState<{ id: string; company_name: string }[]>([]);
  const [opportunities, setOpportunities] = useState<{ id: string; title: string }[]>([]);
  const [profiles, setProfiles] = useState<{ id: string; full_name: string }[]>([]);
  const [open, setOpen] = useState(false);
  const [editTask, setEditTask] = useState<TaskItem | null>(null);
  const [form, setForm] = useState({ description: "", due_date: "", status: "pending", assigned_to: "", lead_id: "", customer_id: "", opportunity_id: "" });
  const { user } = useAuth();

  const load = async () => {
    const { data } = await supabase.from("tasks")
      .select("*, leads(company_name), customers(company_name), opportunities(title)")
      .order("due_date", { ascending: true });
    if (data) setItems(data as any);
    const [{ data: l }, { data: c }, { data: o }, { data: p }] = await Promise.all([
      supabase.from("leads").select("id, company_name").order("company_name"),
      supabase.from("customers").select("id, company_name").order("company_name"),
      supabase.from("opportunities").select("id, title").order("title"),
      supabase.from("profiles").select("id, full_name"),
    ]);
    if (l) setLeads(l);
    if (c) setCustomers(c);
    if (o) setOpportunities(o);
    if (p) setProfiles(p);
  };

  useEffect(() => { load(); }, []);

  const resetForm = () => setForm({ description: "", due_date: "", status: "pending", assigned_to: "", lead_id: "", customer_id: "", opportunity_id: "" });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: any = {
      description: form.description,
      due_date: form.due_date || null,
      status: form.status,
      assigned_to: form.assigned_to || user?.id,
      lead_id: form.lead_id || null,
      customer_id: form.customer_id || null,
      opportunity_id: form.opportunity_id || null,
    };
    const { error } = editTask
      ? await supabase.from("tasks").update(payload).eq("id", editTask.id)
      : await supabase.from("tasks").insert(payload);
    if (error) toast.error(error.message);
    else {
      toast.success(editTask ? "Task updated" : "Task created");
      setOpen(false);
      setEditTask(null);
      resetForm();
      load();
    }
  };

  const deleteTask = async (id: string) => {
    const { error } = await supabase.from("tasks").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Task deleted"); load(); }
  };

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("tasks").update({ status: status as any }).eq("id", id);
    if (error) toast.error(error.message);
    else load();
  };

  const openEdit = (t: TaskItem) => {
    setEditTask(t);
    setForm({
      description: t.description,
      due_date: t.due_date || "",
      status: t.status,
      assigned_to: t.assigned_to || "",
      lead_id: t.lead_id || "",
      customer_id: t.customer_id || "",
      opportunity_id: t.opportunity_id || "",
    });
    setOpen(true);
  };

  const profileName = (id: string | null) => profiles.find(p => p.id === id)?.full_name || "—";

  const linkedTo = (t: TaskItem) => {
    if (t.leads?.company_name) return `Lead: ${t.leads.company_name}`;
    if (t.customers?.company_name) return `Customer: ${t.customers.company_name}`;
    if (t.opportunities?.title) return `Opp: ${t.opportunities.title}`;
    return "—";
  };

  return (
    <AppLayout>
      <PageHeader
        title="Tasks"
        description="Track follow-ups and to-dos"
        action={
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditTask(null); resetForm(); } }}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" />Add Task</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle className="font-display">{editTask ? "Edit Task" : "New Task"}</DialogTitle></DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-2">
                  <Label>Description *</Label>
                  <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Due Date</Label>
                    <Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {taskStatuses.map(s => <SelectItem key={s} value={s} className="capitalize">{s.replace("_", " ")}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Assign To</Label>
                    <Select value={form.assigned_to} onValueChange={(v) => setForm({ ...form, assigned_to: v })}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {profiles.map(p => <SelectItem key={p.id} value={p.id}>{p.full_name || p.id.slice(0, 8)}</SelectItem>)}
                      </SelectContent>
                    </Select>
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
                <Button type="submit" className="w-full">{editTask ? "Update Task" : "Create Task"}</Button>
              </form>
            </DialogContent>
          </Dialog>
        }
      />
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Description</TableHead>
              <TableHead>Linked To</TableHead>
              <TableHead>Assigned To</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No tasks yet</TableCell></TableRow>
            ) : (
              items.map((t) => (
                <TableRow key={t.id} className="animate-fade-in">
                  <TableCell className="font-medium">{t.description}</TableCell>
                  <TableCell className="text-muted-foreground">{linkedTo(t)}</TableCell>
                  <TableCell className="text-muted-foreground">{profileName(t.assigned_to)}</TableCell>
                  <TableCell className={`text-muted-foreground ${t.due_date && new Date(t.due_date) < new Date() && t.status !== "completed" ? "text-destructive font-medium" : ""}`}>
                    {t.due_date || "—"}
                  </TableCell>
                  <TableCell>
                    <Select value={t.status} onValueChange={(v) => updateStatus(t.id, v)}>
                      <SelectTrigger className="w-36 h-8">
                        <StatusBadge status={t.status} />
                      </SelectTrigger>
                      <SelectContent>
                        {taskStatuses.map(s => <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(t)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => deleteTask(t.id)}>
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
