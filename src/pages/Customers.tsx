import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
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
import { Plus } from "lucide-react";

type Customer = {
  id: string;
  company_name: string;
  tax_id: string | null;
  city: string | null;
  country: string | null;
  customer_type: string;
  status: string;
  created_at: string;
};

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ company_name: "", tax_id: "", city: "", country: "", customer_type: "shipper" as const });

  const load = async () => {
    const { data } = await supabase.from("customers").select("*").order("created_at", { ascending: false });
    if (data) setCustomers(data);
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("customers").insert(form);
    if (error) toast.error(error.message);
    else {
      toast.success("Customer created");
      setOpen(false);
      setForm({ company_name: "", tax_id: "", city: "", country: "", customer_type: "shipper" });
      load();
    }
  };

  return (
    <AppLayout>
      <PageHeader
        title="Customers"
        description="Your client base"
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" />Add Customer</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle className="font-display">New Customer</DialogTitle></DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-2">
                  <Label>Company Name *</Label>
                  <Input value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tax ID</Label>
                    <Input value={form.tax_id} onChange={(e) => setForm({ ...form, tax_id: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select value={form.customer_type} onValueChange={(v: any) => setForm({ ...form, customer_type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="shipper">Shipper</SelectItem>
                        <SelectItem value="consignee">Consignee</SelectItem>
                        <SelectItem value="both">Both</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>City</Label>
                    <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Country</Label>
                    <Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
                  </div>
                </div>
                <Button type="submit" className="w-full">Create Customer</Button>
              </form>
            </DialogContent>
          </Dialog>
        }
      />
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Company</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>City</TableHead>
              <TableHead>Country</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No customers yet</TableCell></TableRow>
            ) : (
              customers.map((c) => (
                <TableRow key={c.id} className="animate-fade-in">
                  <TableCell className="font-medium">{c.company_name}</TableCell>
                  <TableCell className="capitalize">{c.customer_type}</TableCell>
                  <TableCell className="text-muted-foreground">{c.city}</TableCell>
                  <TableCell className="text-muted-foreground">{c.country}</TableCell>
                  <TableCell><StatusBadge status={c.status} /></TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </AppLayout>
  );
}
