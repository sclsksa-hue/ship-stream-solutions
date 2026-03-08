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
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";

type Customer = {
  id: string;
  company_name: string;
  tax_id: string | null;
  city: string | null;
  country: string | null;
  customer_type: string;
  status: string;
  industry: string | null;
  notes: string | null;
  created_at: string;
};

type Contact = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  position: string | null;
  is_primary: boolean;
};

type Opportunity = {
  id: string;
  title: string;
  stage: string;
  estimated_value: number | null;
};

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [open, setOpen] = useState(false);
  const [editCust, setEditCust] = useState<Customer | null>(null);
  const [detailCust, setDetailCust] = useState<Customer | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [form, setForm] = useState({ company_name: "", tax_id: "", city: "", country: "", customer_type: "shipper", industry: "", notes: "" });

  const load = async () => {
    const { data } = await supabase.from("customers").select("*").order("created_at", { ascending: false });
    if (data) setCustomers(data as any);
  };

  useEffect(() => { load(); }, []);

  const loadDetail = async (cust: Customer) => {
    setDetailCust(cust);
    const [{ data: c }, { data: o }] = await Promise.all([
      supabase.from("contacts").select("*").eq("customer_id", cust.id).order("is_primary", { ascending: false }),
      supabase.from("opportunities").select("id, title, stage, estimated_value").eq("customer_id", cust.id).order("created_at", { ascending: false }),
    ]);
    setContacts((c as any) || []);
    setOpportunities((o as any) || []);
  };

  const resetForm = () => setForm({ company_name: "", tax_id: "", city: "", country: "", customer_type: "shipper", industry: "", notes: "" });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      company_name: form.company_name,
      tax_id: form.tax_id || null,
      city: form.city || null,
      country: form.country || null,
      customer_type: form.customer_type as any,
      industry: form.industry || null,
      notes: form.notes || null,
    };
    const { error } = editCust
      ? await supabase.from("customers").update(payload).eq("id", editCust.id)
      : await supabase.from("customers").insert(payload);
    if (error) toast.error(error.message);
    else {
      toast.success(editCust ? "Customer updated" : "Customer created");
      setOpen(false);
      setEditCust(null);
      resetForm();
      load();
    }
  };

  const deleteCust = async (id: string) => {
    const { error } = await supabase.from("customers").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Customer deleted"); load(); }
  };

  const openEdit = (c: Customer) => {
    setEditCust(c);
    setForm({
      company_name: c.company_name,
      tax_id: c.tax_id || "",
      city: c.city || "",
      country: c.country || "",
      customer_type: c.customer_type,
      industry: c.industry || "",
      notes: c.notes || "",
    });
    setOpen(true);
  };

  return (
    <AppLayout>
      <PageHeader
        title="Customers"
        description="Your client base"
        action={
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditCust(null); resetForm(); } }}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" />Add Customer</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle className="font-display">{editCust ? "Edit Customer" : "New Customer"}</DialogTitle></DialogHeader>
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
                    <Select value={form.customer_type} onValueChange={(v) => setForm({ ...form, customer_type: v })}>
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
                  <div className="space-y-2">
                    <Label>Industry</Label>
                    <Input value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                </div>
                <Button type="submit" className="w-full">{editCust ? "Update Customer" : "Create Customer"}</Button>
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
              <TableHead>Industry</TableHead>
              <TableHead>City</TableHead>
              <TableHead>Country</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No customers yet</TableCell></TableRow>
            ) : (
              customers.map((c) => (
                <TableRow key={c.id} className="animate-fade-in cursor-pointer" onClick={() => loadDetail(c)}>
                  <TableCell className="font-medium">{c.company_name}</TableCell>
                  <TableCell className="capitalize">{c.customer_type}</TableCell>
                  <TableCell className="text-muted-foreground">{c.industry || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{c.city || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{c.country || "—"}</TableCell>
                  <TableCell><StatusBadge status={c.status} /></TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(c)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => deleteCust(c.id)}>
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

      {/* Detail Dialog */}
      <Dialog open={!!detailCust} onOpenChange={(v) => { if (!v) setDetailCust(null); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">{detailCust?.company_name}</DialogTitle>
          </DialogHeader>
          {detailCust && (
            <div className="grid grid-cols-3 gap-3 text-sm mb-4">
              <div><span className="text-muted-foreground">Type:</span> <span className="capitalize">{detailCust.customer_type}</span></div>
              <div><span className="text-muted-foreground">Industry:</span> {detailCust.industry || "—"}</div>
              <div><span className="text-muted-foreground">Country:</span> {detailCust.country || "—"}</div>
              <div><span className="text-muted-foreground">City:</span> {detailCust.city || "—"}</div>
              <div><span className="text-muted-foreground">Status:</span> <StatusBadge status={detailCust.status} /></div>
            </div>
          )}
          {detailCust?.notes && <p className="text-sm text-muted-foreground mb-4">{detailCust.notes}</p>}

          <Tabs defaultValue="contacts" className="w-full">
            <TabsList className="w-full">
              <TabsTrigger value="contacts" className="flex-1">Contacts ({contacts.length})</TabsTrigger>
              <TabsTrigger value="opportunities" className="flex-1">Opportunities ({opportunities.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="contacts">
              <div className="space-y-2">
                {contacts.map(c => (
                  <div key={c.id} className="flex items-center gap-3 rounded-lg border p-3 text-sm">
                    <div className="flex-1">
                      <span className="font-medium">{c.name}</span>
                      {c.is_primary && <span className="ml-2 text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">Primary</span>}
                      <span className="text-muted-foreground ml-2">{c.position}</span>
                    </div>
                    <span className="text-muted-foreground text-xs">{c.email}</span>
                    <span className="text-muted-foreground text-xs">{c.phone}</span>
                  </div>
                ))}
                {contacts.length === 0 && <p className="text-center text-sm text-muted-foreground py-4">No contacts linked</p>}
              </div>
            </TabsContent>
            <TabsContent value="opportunities">
              <div className="space-y-2">
                {opportunities.map(o => (
                  <div key={o.id} className="flex items-center gap-3 rounded-lg border p-3 text-sm">
                    <span className="font-medium flex-1">{o.title}</span>
                    <StatusBadge status={o.stage} />
                    <span className="text-sm font-medium">{o.estimated_value ? `$${Number(o.estimated_value).toLocaleString()}` : "—"}</span>
                  </div>
                ))}
                {opportunities.length === 0 && <p className="text-center text-sm text-muted-foreground py-4">No opportunities linked</p>}
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
