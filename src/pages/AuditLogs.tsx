import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import PageHeader from "@/components/PageHeader";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { exportToExcel } from "@/lib/exportReport";
import { Download } from "lucide-react";

interface AuditRow {
  id: string;
  user_id: string | null;
  user_email: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  old_values: any;
  new_values: any;
  created_at: string;
}

const actionColors: Record<string, string> = {
  create: "bg-green-500/10 text-green-700",
  update: "bg-blue-500/10 text-blue-700",
  delete: "bg-destructive/10 text-destructive",
  login: "bg-purple-500/10 text-purple-700",
  logout: "bg-muted text-muted-foreground",
};

export default function AuditLogs() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [profiles, setProfiles] = useState<Map<string, string>>(new Map());
  const [search, setSearch] = useState("");
  const [entityFilter, setEntityFilter] = useState<string>("all");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [userFilter, setUserFilter] = useState<string>("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  useEffect(() => {
    (async () => {
      const [logsRes, profilesRes] = await Promise.all([
        supabase.from("audit_logs" as any).select("*").order("created_at", { ascending: false }).limit(1000),
        supabase.from("profiles").select("id, full_name"),
      ]);
      if (logsRes.data) setRows(logsRes.data as any);
      const map = new Map<string, string>();
      (profilesRes.data || []).forEach((p: any) => map.set(p.id, p.full_name || p.id));
      setProfiles(map);
    })();
  }, []);

  const entityTypes = useMemo(() => Array.from(new Set(rows.map((r) => r.entity_type))), [rows]);
  const actionTypes = useMemo(() => Array.from(new Set(rows.map((r) => r.action))), [rows]);
  const userOptions = useMemo(() => {
    const m = new Map<string, string>();
    rows.forEach((r) => { if (r.user_id) m.set(r.user_id, profiles.get(r.user_id) || r.user_email || r.user_id); });
    return Array.from(m.entries());
  }, [rows, profiles]);

  const filtered = rows.filter((r) => {
    if (entityFilter !== "all" && r.entity_type !== entityFilter) return false;
    if (actionFilter !== "all" && r.action !== actionFilter) return false;
    if (userFilter !== "all" && r.user_id !== userFilter) return false;
    if (fromDate && new Date(r.created_at) < new Date(fromDate)) return false;
    if (toDate && new Date(r.created_at) > new Date(toDate + "T23:59:59")) return false;
    if (search) {
      const s = search.toLowerCase();
      const matches = r.entity_type.toLowerCase().includes(s)
        || (r.user_email || "").toLowerCase().includes(s)
        || (profiles.get(r.user_id || "") || "").toLowerCase().includes(s);
      if (!matches) return false;
    }
    return true;
  });

  const handleExport = () => {
    exportToExcel("audit-logs", [{
      name: "Audit",
      rows: filtered.map((r) => ({
        التاريخ: new Date(r.created_at).toLocaleString("ar-SA"),
        المستخدم: profiles.get(r.user_id || "") || "—",
        البريد: r.user_email || "—",
        العملية: r.action,
        الجدول: r.entity_type,
        المعرّف: r.entity_id || "",
      })),
    }]);
  };

  return (
    <AppLayout>
      <PageHeader title="سجل التدقيق" description="جميع الإجراءات الحساسة على البيانات" />
      <div className="flex flex-wrap gap-3 mb-4 items-end">
        <Input placeholder="بحث..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
        <Select value={userFilter} onValueChange={setUserFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="المستخدم" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">جميع المستخدمين</SelectItem>
            {userOptions.map(([id, name]) => <SelectItem key={id} value={id}>{name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="العملية" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">جميع العمليات</SelectItem>
            {actionTypes.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={entityFilter} onValueChange={setEntityFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="الجدول" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">جميع الجداول</SelectItem>
            {entityTypes.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-40" />
        <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-40" />
        <Button onClick={handleExport} variant="outline" className="gap-2">
          <Download className="h-4 w-4" /> تصدير Excel
        </Button>
      </div>
      <div className="rounded-lg border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>التاريخ</TableHead>
              <TableHead>المستخدم</TableHead>
              <TableHead>البريد</TableHead>
              <TableHead>العملية</TableHead>
              <TableHead>الجدول</TableHead>
              <TableHead>المعرّف</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">لا توجد سجلات</TableCell></TableRow>
            ) : (
              filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="text-xs text-muted-foreground" dir="ltr">{new Date(r.created_at).toLocaleString("ar-SA")}</TableCell>
                  <TableCell>{profiles.get(r.user_id || "") || "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground" dir="ltr">{r.user_email || "—"}</TableCell>
                  <TableCell><Badge className={actionColors[r.action] || ""}>{r.action}</Badge></TableCell>
                  <TableCell className="font-mono text-xs">{r.entity_type}</TableCell>
                  <TableCell className="font-mono text-[10px] text-muted-foreground" dir="ltr">{r.entity_id?.slice(0, 8) || "—"}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">يعرض آخر 1000 سجل. الوصول مقصور على المدير العام.</p>
    </AppLayout>
  );
}
