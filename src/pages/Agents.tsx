import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil } from "lucide-react";
import { toast } from "sonner";

type Agent = {
  id: string; agent_name: string; country: string | null; city: string | null;
  contact_person: string | null; phone: string | null; email: string | null;
  agent_type: string | null; notes: string | null;
};

const emptyForm = { agent_name: "", country: "", city: "", contact_person: "", phone: "", email: "", agent_type: "overseas_agent", notes: "" };

export default function Agents() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Agent | null>(null);
  const [form, setForm] = useState(emptyForm);

  const load = async () => {
    const { data } = await supabase.from("agents").select("*").order("agent_name");
    setAgents(data || []);
  };
  useEffect(() => { load(); }, []);

  const openEdit = (a: Agent) => {
    setEditing(a);
    setForm({ agent_name: a.agent_name, country: a.country || "", city: a.city || "", contact_person: a.contact_person || "", phone: a.phone || "", email: a.email || "", agent_type: a.agent_type || "overseas_agent", notes: a.notes || "" });
    setOpen(true);
  };

  const handleSave = async () => {
    if (!form.agent_name) { toast.error("Agent name required"); return; }
    const payload = {
      agent_name: form.agent_name,
      country: form.country || null,
      city: form.city || null,
      contact_person: form.contact_person || null,
      phone: form.phone || null,
      email: form.email || null,
      agent_type: form.agent_type || null,
      notes: form.notes || null,
    };
    const { error } = editing
      ? await supabase.from("agents").update(payload).eq("id", editing.id)
      : await supabase.from("agents").insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success(editing ? "Agent updated" : "Agent created");
    setOpen(false); setEditing(null); setForm(emptyForm); load();
  };

  return (
    <AppLayout>
      <PageHeader title="Agents" description="Partner network management" action={
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditing(null); setForm(emptyForm); } }}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />New Agent</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing ? "Edit Agent" : "New Agent"}</DialogTitle></DialogHeader>
            <div className="grid gap-3">
              <div><Label>Agent Name *</Label><Input value={form.agent_name} onChange={e => setForm({ ...form, agent_name: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Country</Label><Input value={form.country} onChange={e => setForm({ ...form, country: e.target.value })} /></div>
                <div><Label>City</Label><Input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} /></div>
              </div>
              <div><Label>Contact Person</Label><Input value={form.contact_person} onChange={e => setForm({ ...form, contact_person: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Phone</Label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
                <div><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
              </div>
              <div><Label>Type</Label><Input value={form.agent_type} onChange={e => setForm({ ...form, agent_type: e.target.value })} placeholder="overseas_agent, shipping_line, trucking..." /></div>
              <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
              <Button onClick={handleSave}>{editing ? "Update" : "Create"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      } />

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead><TableHead>Country</TableHead><TableHead>City</TableHead>
                <TableHead>Contact</TableHead><TableHead>Phone</TableHead><TableHead>Email</TableHead>
                <TableHead>Type</TableHead><TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {agents.map(a => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.agent_name}</TableCell>
                  <TableCell>{a.country || "—"}</TableCell>
                  <TableCell>{a.city || "—"}</TableCell>
                  <TableCell>{a.contact_person || "—"}</TableCell>
                  <TableCell>{a.phone || "—"}</TableCell>
                  <TableCell>{a.email || "—"}</TableCell>
                  <TableCell>{a.agent_type || "—"}</TableCell>
                  <TableCell><Button size="sm" variant="ghost" onClick={() => openEdit(a)}><Pencil className="h-4 w-4" /></Button></TableCell>
                </TableRow>
              ))}
              {agents.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No agents yet</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AppLayout>
  );
}
