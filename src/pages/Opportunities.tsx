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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus } from "lucide-react";

type Opportunity = {
  id: string;
  customer_id: string;
  title: string;
  description: string | null;
  stage: string;
  estimated_value: number | null;
  currency: string;
  expected_close: string | null;
  created_at: string;
  customers?: { company_name: string };
};

export default function Opportunities() {
  const [items, setItems] = useState<Opportunity[]>([]);
  const [customers, setCustomers] = useState<{ id: string; company_name: string }[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ customer_id: "", title: "", description: "", estimated_value: "", currency: "USD", expected_close: "" });
  const { user } = useAuth();

  const load = async () => {
    const { data } = await supabase.from("opportunities").select("*, customers(company_name)").order("created_at", { ascending: false });
    if (data) setItems(data as any);
    const { data: custs } = await supabase.from("customers").select("id, company_name").order("company_name");
    if (custs) setCustomers(custs);
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("opportunities").insert({
      customer_id: form.customer_id,
      title: form.title,
      description: form.description || null,
      estimated_value: form.estimated_value ? parseFloat(form.estimated_value) : null,
      currency: form.currency,
      expected_close: form.expected_close || null,
      assigned_to: user?.id,
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Opportunity created");
      setOpen(false);
      setForm({ customer_id: "", title: "", description: "", estimated_value: "", currency: "USD", expected_close: "" });
      load();
    }
  };

  const updateStage = async (id: string, stage: string) => {
    const { error } = await supabase.from("opportunities").update({ stage: stage as any }).eq("id", id);
    if (error) toast.error(error.message);
    else load();
  };

  return (
    <AppLayout>
      <PageHeader
        title="Opportunities"
        description="Track your sales opportunities"
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" />Add Opportunity</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle className="font-display">New Opportunity</DialogTitle></DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-2">
                  <Label>Customer *</Label>
                  <Select value={form.customer_id} onValueChange={(v) => setForm({ ...form, customer_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                    <SelectContent>
                      {customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Title *</Label>
                  <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Estimated Value</Label>
                    <Input type="number" value={form.estimated_value} onChange={(e) => setForm({ ...form, estimated_value: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Expected Close</Label>
                    <Input type="date" value={form.expected_close} onChange={(e) => setForm({ ...form, expected_close: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                </div>
                <Button type="submit" className="w-full">Create Opportunity</Button>
              </form>
            </DialogContent>
          </Dialog>
        }
      />
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Value</TableHead>
              <TableHead>Stage</TableHead>
              <TableHead>Expected Close</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No opportunities yet</TableCell></TableRow>
            ) : (
              items.map((o) => (
                <TableRow key={o.id} className="animate-fade-in">
                  <TableCell className="font-medium">{o.title}</TableCell>
                  <TableCell>{o.customers?.company_name}</TableCell>
                  <TableCell className="font-medium">{o.estimated_value ? `$${Number(o.estimated_value).toLocaleString()}` : "—"}</TableCell>
                  <TableCell>
                    <Select value={o.stage} onValueChange={(v) => updateStage(o.id, v)}>
                      <SelectTrigger className="w-36 h-8">
                        <StatusBadge status={o.stage} />
                      </SelectTrigger>
                      <SelectContent>
                        {["prospecting", "proposal", "negotiation", "won", "lost"].map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{o.expected_close || "—"}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </AppLayout>
  );
}
