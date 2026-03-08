import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import AppLayout from "@/components/AppLayout";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import StatusBadge from "@/components/StatusBadge";
import { Plus, Download, FileText } from "lucide-react";
import { toast } from "sonner";

const DOC_TYPES = ["bill_of_lading", "invoice", "packing_list", "customs_declaration", "certificate_of_origin", "other"] as const;

type Doc = {
  id: string; shipment_id: string; document_type: string; file_name: string;
  file_url: string; file_size: number | null; notes: string | null; created_at: string;
  shipments?: { shipment_number: string } | null;
};

export default function Documents() {
  const { user } = useAuth();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [shipments, setShipments] = useState<{ id: string; shipment_number: string }[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ shipment_id: "", document_type: "other" as string, notes: "" });
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    const [d, s] = await Promise.all([
      supabase.from("documents").select("*, shipments(shipment_number)").order("created_at", { ascending: false }),
      supabase.from("shipments").select("id, shipment_number").order("shipment_number"),
    ]);
    setDocs((d.data as any) || []);
    setShipments(s.data || []);
  };
  useEffect(() => { load(); }, []);

  const handleUpload = async () => {
    if (!form.shipment_id || !file) { toast.error("Shipment and file required"); return; }
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${form.shipment_id}/${Date.now()}.${ext}`;
    const { error: uploadErr } = await supabase.storage.from("shipment-documents").upload(path, file);
    if (uploadErr) { toast.error(uploadErr.message); setUploading(false); return; }
    const { data: urlData } = supabase.storage.from("shipment-documents").getPublicUrl(path);
    const { error } = await supabase.from("documents").insert({
      shipment_id: form.shipment_id,
      document_type: form.document_type as any,
      file_name: file.name,
      file_url: urlData.publicUrl,
      file_size: file.size,
      uploaded_by: user?.id,
      notes: form.notes || null,
    });
    if (error) { toast.error(error.message); setUploading(false); return; }
    toast.success("Document uploaded");
    setOpen(false); setFile(null); setForm({ shipment_id: "", document_type: "other", notes: "" });
    setUploading(false); load();
  };

  return (
    <AppLayout>
      <PageHeader title="Documents" description="Shipment document management">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Upload Document</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Upload Document</DialogTitle></DialogHeader>
            <div className="grid gap-3">
              <div>
                <Label>Shipment *</Label>
                <Select value={form.shipment_id} onValueChange={v => setForm({ ...form, shipment_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select shipment" /></SelectTrigger>
                  <SelectContent>{shipments.map(s => <SelectItem key={s.id} value={s.id}>{s.shipment_number}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Document Type</Label>
                <Select value={form.document_type} onValueChange={v => setForm({ ...form, document_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{DOC_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>File *</Label>
                <Input type="file" onChange={e => setFile(e.target.files?.[0] || null)} />
              </div>
              <div><Label>Notes</Label><Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
              <Button onClick={handleUpload} disabled={uploading}>{uploading ? "Uploading..." : "Upload"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>File</TableHead><TableHead>Shipment</TableHead><TableHead>Type</TableHead>
                <TableHead>Size</TableHead><TableHead>Uploaded</TableHead><TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {docs.map(d => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium flex items-center gap-2"><FileText className="h-4 w-4 text-muted-foreground" />{d.file_name}</TableCell>
                  <TableCell>{d.shipments?.shipment_number || "—"}</TableCell>
                  <TableCell><StatusBadge status={d.document_type.replace(/_/g, " ")} /></TableCell>
                  <TableCell>{d.file_size ? `${(d.file_size / 1024).toFixed(1)} KB` : "—"}</TableCell>
                  <TableCell>{new Date(d.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Button size="sm" variant="ghost" asChild>
                      <a href={d.file_url} target="_blank" rel="noopener noreferrer"><Download className="h-4 w-4" /></a>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {docs.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No documents yet</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AppLayout>
  );
}
