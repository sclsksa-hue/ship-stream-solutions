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
};

const taskStatuses = ["pending", "in_progress", "completed", "cancelled"];

export default function Tasks() {
  const [items, setItems] = useState<TaskItem[]>([]);
  const [profiles, setProfiles] = useState<{ id: string; full_name: string }[]>([]);
  const [open, setOpen] = useState(false);
  const [editTask, setEditTask] = useState<TaskItem | null>(null);
  const [form, setForm] = useState({ description: "", due_date: "", status: "pending", assigned_to: "" });
  const { user } = useAuth();

  const load = async () => {
    const { data } = await supabase.from("tasks")
      .select("id, description, due_date, status, assigned_to")
      .order("due_date", { ascending: true });
    if (data) setItems(data);
    const { data: p } = await supabase.from("profiles").select("id, full_name");
    if (p) setProfiles(p);
  };

  useEffect(() => { load(); }, []);

  const resetForm = () => setForm({ description: "", due_date: "", status: "pending", assigned_to: "" });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      description: form.description,
      due_date: form.due_date || null,
      status: form.status as any,
      assigned_to: form.assigned_to || user?.id,
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
    });
    setOpen(true);
  };

  const profileName = (id: string | null) => profiles.find(p => p.id === id)?.full_name || "—";

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
            <DialogContent className="max-w-md">
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
              <TableHead>Assigned To</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No tasks yet</TableCell></TableRow>
            ) : (
              items.map((t) => (
                <TableRow key={t.id} className="animate-fade-in">
                  <TableCell className="font-medium">{t.description}</TableCell>
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
