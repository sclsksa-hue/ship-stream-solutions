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

type Quotation = {
  id: string;
  quote_number: string;
  customer_id: string;
  opportunity_id: string | null;
  status: string;
  total_amount: number | null;
  currency: string;
  valid_until: string | null;
  notes: string | null;
  created_at: string;
  customers?: { company_name: string };
};

export default function Quotations() {
  const [items, setItems] = useState<Quotation[]>([]);
  const [customers, setCustomers] = useState<{ id: string; company_name: string }[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ customer_id: "", total_amount: "", currency: "USD", valid_until: "", notes: "" });
  const { user } = useAuth();

  const load = async () => {
    const { data } = await supabase.from("quotations").select("*, customers(company_name)").order("created_at", { ascending: false });
    if (data) setItems(data as any);
    const { data: custs } = await supabase.from("customers").select("id, company_name").order("company_name");
    if (custs) setCustomers(custs);
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("quotations").insert({
      customer_id: form.customer_id,
      total_amount: form.total_amount ? parseFloat(form.total_amount) : null,
      currency: form.currency,
      valid_until: form.valid_until || null,
      notes: form.notes || null,
      created_by: user?.id,
      quote_number: "",
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Quotation created");
      setOpen(false);
      setForm({ customer_id: "", total_amount: "", currency: "USD", valid_until: "", notes: "" });
      load();
    }
  };

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("quotations").update({ status }).eq("id", id);
    if (error) toast.error(error.message);
    else load();
  };

  return (
    <AppLayout>
      <PageHeader
        title="Quotations"
        description="Price quotes for your customers"
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" />New Quote</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle className="font-display">New Quotation</DialogTitle></DialogHeader>
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
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Total Amount</Label>
                    <Input type="number" value={form.total_amount} onChange={(e) => setForm({ ...form, total_amount: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Valid Until</Label>
                    <Input type="date" value={form.valid_until} onChange={(e) => setForm({ ...form, valid_until: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                </div>
                <Button type="submit" className="w-full">Create Quotation</Button>
              </form>
            </DialogContent>
          </Dialog>
        }
      />
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Quote #</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Valid Until</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No quotations yet</TableCell></TableRow>
            ) : (
              items.map((q) => (
                <TableRow key={q.id} className="animate-fade-in">
                  <TableCell className="font-mono font-medium">{q.quote_number}</TableCell>
                  <TableCell>{q.customers?.company_name}</TableCell>
                  <TableCell className="font-medium">{q.total_amount ? `$${Number(q.total_amount).toLocaleString()}` : "—"}</TableCell>
                  <TableCell>
                    <Select value={q.status} onValueChange={(v) => updateStatus(q.id, v)}>
                      <SelectTrigger className="w-32 h-8">
                        <StatusBadge status={q.status} />
                      </SelectTrigger>
                      <SelectContent>
                        {["draft", "sent", "accepted", "rejected", "expired"].map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{q.valid_until || "—"}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </AppLayout>
  );
}
