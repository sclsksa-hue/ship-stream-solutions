import { useEffect, useState, useMemo } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Plus, ArrowRightLeft, Pencil, Trash2, Phone, Mail, Calendar, MessageSquare, Star, TrendingUp, Download } from "lucide-react";
import { exportToCsv } from "@/lib/csvUtils";

type Lead = {
  id: string; company_name: string; contact_name: string; email: string | null;
  phone: string | null; source: string | null; status: string; notes: string | null;
  country: string | null; industry: string | null; assigned_to: string | null; created_at: string;
};

type Activity = { id: string; activity_type: string; notes: string | null; activity_date: string; assigned_to: string | null; };
type Task = { id: string; description: string; due_date: string | null; status: string; assigned_to: string | null; };

// Lead scoring algorithm
const scoreLeadFn = (lead: Lead, activityCount: number): { score: number; breakdown: { label: string; pts: number }[] } => {
  const breakdown: { label: string; pts: number }[] = [];
  // Source quality
  const srcScore: Record<string, number> = { referral: 25, exhibition: 20, linkedin: 15, website: 10, cold_call: 5 };
  const srcPts = srcScore[lead.source || ""] || 5;
  breakdown.push({ label: "Source", pts: srcPts });
  // Completeness
  let compPts = 0;
  if (lead.email) compPts += 5;
  if (lead.phone) compPts += 5;
  if (lead.industry) compPts += 5;
  if (lead.country) compPts += 5;
  breakdown.push({ label: "Profile", pts: compPts });
  // Status progression
  const statusScore: Record<string, number> = { new: 5, contacted: 15, qualified: 30, converted: 0, lost: 0 };
  const stPts = statusScore[lead.status] || 0;
  breakdown.push({ label: "Stage", pts: stPts });
  // Engagement (activities)
  const engPts = Math.min(activityCount * 5, 20);
  breakdown.push({ label: "Engagement", pts: engPts });
  return { score: breakdown.reduce((a, b) => a + b.pts, 0), breakdown };
};

export default function Leads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [profiles, setProfiles] = useState<{ id: string; full_name: string }[]>([]);
  const [activityCounts, setActivityCounts] = useState<Map<string, number>>(new Map());
  const [open, setOpen] = useState(false);
  const [editLead, setEditLead] = useState<Lead | null>(null);
  const [detailLead, setDetailLead] = useState<Lead | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [actForm, setActForm] = useState({ activity_type: "call", notes: "", activity_date: new Date().toISOString().slice(0, 16) });
  const [taskForm, setTaskForm] = useState({ description: "", due_date: "", status: "pending" });
  const [form, setForm] = useState({ company_name: "", contact_name: "", email: "", phone: "", source: "", notes: "", country: "", industry: "", assigned_to: "" });
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "score">("date");
  const { user } = useAuth();

  const load = async () => {
    const [lRes, pRes, aRes] = await Promise.all([
      supabase.from("leads").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("id, full_name"),
      supabase.from("activities").select("lead_id"),
    ]);
    if (lRes.data) setLeads(lRes.data as any);
    if (pRes.data) setProfiles(pRes.data);
    // Count activities per lead
    const counts = new Map<string, number>();
    (aRes.data || []).forEach((a: any) => { if (a.lead_id) counts.set(a.lead_id, (counts.get(a.lead_id) || 0) + 1); });
    setActivityCounts(counts);
  };

  useEffect(() => { load(); }, []);

  const scoredLeads = useMemo(() => {
    return leads.map(l => ({ ...l, ...scoreLeadFn(l, activityCounts.get(l.id) || 0) }));
  }, [leads, activityCounts]);

  const filtered = useMemo(() => {
    let result = scoredLeads;
    if (filterStatus !== "all") result = result.filter(l => l.status === filterStatus);
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      result = result.filter(l => l.company_name.toLowerCase().includes(q) || l.contact_name.toLowerCase().includes(q));
    }
    if (sortBy === "score") result = [...result].sort((a, b) => b.score - a.score);
    return result;
  }, [scoredLeads, filterStatus, searchTerm, sortBy]);

  const loadDetail = async (lead: Lead) => {
    setDetailLead(lead);
    const [{ data: acts }, { data: tsks }] = await Promise.all([
      supabase.from("activities").select("*").eq("lead_id", lead.id).order("activity_date", { ascending: false }),
      supabase.from("tasks").select("*").eq("lead_id", lead.id).order("due_date", { ascending: true }),
    ]);
    setActivities((acts as any) || []);
    setTasks((tsks as any) || []);
  };

  const resetForm = () => setForm({ company_name: "", contact_name: "", email: "", phone: "", source: "", notes: "", country: "", industry: "", assigned_to: "" });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { company_name: form.company_name, contact_name: form.contact_name, email: form.email || null, phone: form.phone || null, source: form.source || null, notes: form.notes || null, country: form.country || null, industry: form.industry || null, assigned_to: form.assigned_to || user?.id, created_by: user?.id };
    const { error } = editLead ? await supabase.from("leads").update(payload).eq("id", editLead.id) : await supabase.from("leads").insert(payload);
    if (error) toast.error(error.message);
    else { toast.success(editLead ? "Lead updated" : "Lead created"); setOpen(false); setEditLead(null); resetForm(); load(); }
  };

  const deleteLead = async (id: string) => {
    const { error } = await supabase.from("leads").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Lead deleted"); load(); }
  };

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("leads").update({ status: status as any }).eq("id", id);
    if (error) toast.error(error.message); else load();
  };

  const convertToCustomer = async (lead: Lead) => {
    const { error } = await supabase.from("customers").insert({ lead_id: lead.id, company_name: lead.company_name, country: lead.country, industry: lead.industry });
    if (error) { toast.error(error.message); return; }
    await supabase.from("leads").update({ status: "converted" as any }).eq("id", lead.id);
    toast.success("Lead converted to customer!"); load();
  };

  const openEdit = (lead: Lead) => {
    setEditLead(lead);
    setForm({ company_name: lead.company_name, contact_name: lead.contact_name, email: lead.email || "", phone: lead.phone || "", source: lead.source || "", notes: lead.notes || "", country: lead.country || "", industry: lead.industry || "", assigned_to: lead.assigned_to || "" });
    setOpen(true);
  };

  const addActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!detailLead) return;
    const { error } = await supabase.from("activities").insert({ lead_id: detailLead.id, activity_type: actForm.activity_type as any, notes: actForm.notes || null, activity_date: actForm.activity_date, assigned_to: user?.id });
    if (error) toast.error(error.message);
    else { toast.success("Activity added"); setActForm({ activity_type: "call", notes: "", activity_date: new Date().toISOString().slice(0, 16) }); loadDetail(detailLead); }
  };

  const addTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!detailLead) return;
    const { error } = await supabase.from("tasks").insert({ lead_id: detailLead.id, description: taskForm.description, due_date: taskForm.due_date || null, status: taskForm.status as any, assigned_to: user?.id });
    if (error) toast.error(error.message);
    else { toast.success("Task added"); setTaskForm({ description: "", due_date: "", status: "pending" }); loadDetail(detailLead); }
  };

  const activityIcon = (type: string) => {
    if (type === "call") return <Phone className="h-3.5 w-3.5" />;
    if (type === "email") return <Mail className="h-3.5 w-3.5" />;
    return <Calendar className="h-3.5 w-3.5" />;
  };

  const profileName = (id: string | null) => profiles.find(p => p.id === id)?.full_name || "—";

  const scoreColor = (score: number) => score >= 60 ? "text-success" : score >= 35 ? "text-warning" : "text-muted-foreground";
  const scoreBg = (score: number) => score >= 60 ? "[&>div]:bg-success" : score >= 35 ? "[&>div]:bg-warning" : "[&>div]:bg-muted-foreground";

  return (
    <AppLayout>
      <PageHeader title="Leads" description="Manage potential clients" action={
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditLead(null); resetForm(); } }}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />Add Lead</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle className="font-display">{editLead ? "Edit Lead" : "New Lead"}</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Company Name *</Label><Input value={form.company_name} onChange={e => setForm({ ...form, company_name: e.target.value })} required /></div>
                <div className="space-y-2"><Label>Contact Name *</Label><Input value={form.contact_name} onChange={e => setForm({ ...form, contact_name: e.target.value })} required /></div>
                <div className="space-y-2"><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
                <div className="space-y-2"><Label>Phone</Label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
                <div className="space-y-2"><Label>Country</Label><Input value={form.country} onChange={e => setForm({ ...form, country: e.target.value })} /></div>
                <div className="space-y-2"><Label>Industry</Label><Input value={form.industry} onChange={e => setForm({ ...form, industry: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Source</Label>
                  <Select value={form.source} onValueChange={v => setForm({ ...form, source: v })}>
                    <SelectTrigger><SelectValue placeholder="Select source" /></SelectTrigger>
                    <SelectContent>{["website", "referral", "cold_call", "exhibition", "linkedin"].map(s => <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Assign To</Label>
                  <Select value={form.assigned_to} onValueChange={v => setForm({ ...form, assigned_to: v })}>
                    <SelectTrigger><SelectValue placeholder="Select salesperson" /></SelectTrigger>
                    <SelectContent>{profiles.map(p => <SelectItem key={p.id} value={p.id}>{p.full_name || p.id.slice(0, 8)}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2"><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
              <Button type="submit" className="w-full">{editLead ? "Update Lead" : "Create Lead"}</Button>
            </form>
          </DialogContent>
        </Dialog>
      } />

      {/* Filters */}
      <div className="flex gap-3 mb-4 flex-wrap items-center">
        <Input placeholder="Search leads..." className="max-w-xs" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {["new", "contacted", "qualified", "converted", "lost"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={v => setSortBy(v as any)}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="date">Sort by Date</SelectItem>
            <SelectItem value="score">Sort by Score</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground ml-auto">{filtered.length} leads</span>
        <Button size="sm" variant="outline" onClick={() => exportToCsv(filtered.map(l => ({
          company: l.company_name, contact: l.contact_name, email: l.email || "", phone: l.phone || "",
          country: l.country || "", industry: l.industry || "", source: l.source || "", status: l.status, score: l.score,
        })), "leads")}>
          <Download className="h-4 w-4 mr-1" />CSV
        </Button>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Score</TableHead><TableHead>Company</TableHead><TableHead>Contact</TableHead>
              <TableHead>Country</TableHead><TableHead>Industry</TableHead><TableHead>Source</TableHead>
              <TableHead>Assigned To</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No leads found</TableCell></TableRow>
            ) : (
              filtered.map(lead => (
                <TableRow key={lead.id} className="cursor-pointer" onClick={() => loadDetail(lead)}>
                  <TableCell>
                    <div className="flex items-center gap-2 min-w-[80px]">
                      <Progress value={lead.score} className={`h-2 w-12 ${scoreBg(lead.score)}`} />
                      <span className={`text-xs font-bold ${scoreColor(lead.score)}`}>{lead.score}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{lead.company_name}</TableCell>
                  <TableCell>{lead.contact_name}</TableCell>
                  <TableCell className="text-muted-foreground">{lead.country || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{lead.industry || "—"}</TableCell>
                  <TableCell className="text-muted-foreground capitalize">{lead.source?.replace("_", " ") || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{profileName(lead.assigned_to)}</TableCell>
                  <TableCell>
                    <div onClick={e => e.stopPropagation()}>
                      <Select value={lead.status} onValueChange={v => updateStatus(lead.id, v)}>
                        <SelectTrigger className="w-32 h-8"><StatusBadge status={lead.status} /></SelectTrigger>
                        <SelectContent>{["new", "contacted", "qualified", "converted", "lost"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </TableCell>
                  <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      {lead.phone && (
                        <Button size="icon" variant="ghost" className="h-8 w-8" asChild title="WhatsApp">
                          <a href={`https://wa.me/${lead.phone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer"><MessageSquare className="h-3.5 w-3.5 text-success" /></a>
                        </Button>
                      )}
                      {lead.phone && (
                        <Button size="icon" variant="ghost" className="h-8 w-8" asChild title="Call">
                          <a href={`tel:${lead.phone}`}><Phone className="h-3.5 w-3.5 text-info" /></a>
                        </Button>
                      )}
                      {lead.status === "qualified" && (
                        <Button size="sm" variant="outline" onClick={() => convertToCustomer(lead)}><ArrowRightLeft className="mr-1 h-3 w-3" />Convert</Button>
                      )}
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(lead)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => deleteLead(lead.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Detail Dialog with Score */}
      <Dialog open={!!detailLead} onOpenChange={v => { if (!v) setDetailLead(null); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-display">{detailLead?.company_name} — {detailLead?.contact_name}</DialogTitle></DialogHeader>
          {detailLead && (() => {
            const { score, breakdown } = scoreLeadFn(detailLead, activityCounts.get(detailLead.id) || 0);
            return (
              <>
                {/* Score card */}
                <Card className="mb-4">
                  <CardContent className="py-3 px-4">
                    <div className="flex items-center gap-3 mb-2">
                      <Star className="h-4 w-4 text-warning" />
                      <span className="font-display font-bold text-lg">Lead Score: <span className={scoreColor(score)}>{score}/100</span></span>
                    </div>
                    <div className="flex gap-4">
                      {breakdown.map(b => (
                        <div key={b.label} className="text-xs">
                          <span className="text-muted-foreground">{b.label}:</span>{" "}
                          <span className="font-medium">{b.pts}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-3 gap-3 text-sm mb-4">
                  <div><span className="text-muted-foreground">Email:</span> {detailLead.email || "—"}</div>
                  <div><span className="text-muted-foreground">Phone:</span> {detailLead.phone || "—"}</div>
                  <div><span className="text-muted-foreground">Country:</span> {detailLead.country || "—"}</div>
                  <div><span className="text-muted-foreground">Industry:</span> {detailLead.industry || "—"}</div>
                  <div><span className="text-muted-foreground">Source:</span> {detailLead.source || "—"}</div>
                  <div><span className="text-muted-foreground">Status:</span> <StatusBadge status={detailLead.status} /></div>
                </div>

                <div className="flex gap-2 mb-4">
                  {detailLead.phone && <Button size="sm" variant="outline" asChild><a href={`tel:${detailLead.phone}`}><Phone className="h-3.5 w-3.5 mr-1" />Call</a></Button>}
                  {detailLead.phone && <Button size="sm" variant="outline" asChild><a href={`https://wa.me/${detailLead.phone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer"><MessageSquare className="h-3.5 w-3.5 mr-1" />WhatsApp</a></Button>}
                  {detailLead.email && <Button size="sm" variant="outline" asChild><a href={`mailto:${detailLead.email}`}><Mail className="h-3.5 w-3.5 mr-1" />Email</a></Button>}
                </div>
              </>
            );
          })()}

          <Tabs defaultValue="activities" className="w-full">
            <TabsList className="w-full">
              <TabsTrigger value="activities" className="flex-1">Activities ({activities.length})</TabsTrigger>
              <TabsTrigger value="tasks" className="flex-1">Tasks ({tasks.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="activities" className="space-y-4">
              <form onSubmit={addActivity} className="flex gap-2 items-end">
                <Select value={actForm.activity_type} onValueChange={v => setActForm({ ...actForm, activity_type: v })}>
                  <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                  <SelectContent>{["call", "meeting", "email"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
                <Input placeholder="Notes..." value={actForm.notes} onChange={e => setActForm({ ...actForm, notes: e.target.value })} className="flex-1" />
                <Input type="datetime-local" value={actForm.activity_date} onChange={e => setActForm({ ...actForm, activity_date: e.target.value })} className="w-48" />
                <Button type="submit" size="sm"><Plus className="h-4 w-4" /></Button>
              </form>
              <div className="space-y-2">
                {activities.map(a => (
                  <div key={a.id} className="flex items-start gap-3 rounded-lg border p-3 text-sm">
                    <div className="mt-0.5 text-muted-foreground">{activityIcon(a.activity_type)}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium capitalize">{a.activity_type}</span>
                        <span className="text-xs text-muted-foreground">{new Date(a.activity_date).toLocaleString()}</span>
                      </div>
                      {a.notes && <p className="text-muted-foreground mt-1">{a.notes}</p>}
                    </div>
                  </div>
                ))}
                {activities.length === 0 && <p className="text-center text-sm text-muted-foreground py-4">No activities yet</p>}
              </div>
            </TabsContent>
            <TabsContent value="tasks" className="space-y-4">
              <form onSubmit={addTask} className="flex gap-2 items-end">
                <Input placeholder="Task description..." value={taskForm.description} onChange={e => setTaskForm({ ...taskForm, description: e.target.value })} required className="flex-1" />
                <Input type="date" value={taskForm.due_date} onChange={e => setTaskForm({ ...taskForm, due_date: e.target.value })} className="w-40" />
                <Button type="submit" size="sm"><Plus className="h-4 w-4" /></Button>
              </form>
              <div className="space-y-2">
                {tasks.map(t => {
                  const overdue = t.due_date && new Date(t.due_date) < new Date() && t.status === "pending";
                  return (
                    <div key={t.id} className={`flex items-center gap-3 rounded-lg border p-3 text-sm ${overdue ? "border-destructive/30 bg-destructive/5" : ""}`}>
                      <StatusBadge status={t.status} />
                      <span className="flex-1">{t.description}</span>
                      {t.due_date && <span className={`text-xs ${overdue ? "text-destructive font-medium" : "text-muted-foreground"}`}>{overdue ? "⚠ " : ""}{new Date(t.due_date).toLocaleDateString()}</span>}
                    </div>
                  );
                })}
                {tasks.length === 0 && <p className="text-center text-sm text-muted-foreground py-4">No tasks yet</p>}
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
