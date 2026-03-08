import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";

type Contact = {
  id: string;
  customer_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  position: string | null;
  is_primary: boolean;
  customers?: { company_name: string };
};

export default function Contacts() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [customers, setCustomers] = useState<{ id: string; company_name: string }[]>([]);
  const [open, setOpen] = useState(false);
  const [editContact, setEditContact] = useState<Contact | null>(null);
  const [form, setForm] = useState({ name: "", email: "", phone: "", position: "", customer_id: "", is_primary: false });

  const load = async () => {
    const { data } = await supabase.from("contacts").select("*, customers(company_name)").order("created_at", { ascending: false });
    if (data) setContacts(data as any);
    const { data: custs } = await supabase.from("customers").select("id, company_name").order("company_name");
    if (custs) setCustomers(custs);
  };

  useEffect(() => { load(); }, []);

  const resetForm = () => setForm({ name: "", email: "", phone: "", position: "", customer_id: "", is_primary: false });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: form.name,
      email: form.email || null,
      phone: form.phone || null,
      position: form.position || null,
      customer_id: form.customer_id,
      is_primary: form.is_primary,
    };
    const { error } = editContact
      ? await supabase.from("contacts").update(payload).eq("id", editContact.id)
      : await supabase.from("contacts").insert(payload);
    if (error) toast.error(error.message);
    else {
      toast.success(editContact ? "Contact updated" : "Contact created");
      setOpen(false);
      setEditContact(null);
      resetForm();
      load();
    }
  };

  const deleteContact = async (id: string) => {
    const { error } = await supabase.from("contacts").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Contact deleted"); load(); }
  };

  const openEdit = (c: Contact) => {
    setEditContact(c);
    setForm({ name: c.name, email: c.email || "", phone: c.phone || "", position: c.position || "", customer_id: c.customer_id, is_primary: c.is_primary });
    setOpen(true);
  };

  return (
    <AppLayout>
      <PageHeader
        title="Contacts"
        description="People at your customer companies"
        action={
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditContact(null); resetForm(); } }}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" />Add Contact</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle className="font-display">{editContact ? "Edit Contact" : "New Contact"}</DialogTitle></DialogHeader>
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
                    <Label>Name *</Label>
                    <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Position / Role</Label>
                    <Input value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={form.is_primary} onCheckedChange={(v) => setForm({ ...form, is_primary: v })} />
                  <Label>Primary Contact</Label>
                </div>
                <Button type="submit" className="w-full">{editContact ? "Update Contact" : "Create Contact"}</Button>
              </form>
            </DialogContent>
          </Dialog>
        }
      />
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Position</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Primary</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contacts.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No contacts yet</TableCell></TableRow>
            ) : (
              contacts.map((c) => (
                <TableRow key={c.id} className="animate-fade-in">
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell>{c.customers?.company_name}</TableCell>
                  <TableCell className="text-muted-foreground">{c.position || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{c.email || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{c.phone || "—"}</TableCell>
                  <TableCell>{c.is_primary ? "✓" : ""}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(c)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => deleteContact(c.id)}>
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
