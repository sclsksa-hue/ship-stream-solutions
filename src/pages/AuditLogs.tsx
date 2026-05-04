import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import PageHeader from "@/components/PageHeader";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface AuditRow {
  id: string;
  user_id: string | null;
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
};

export default function AuditLogs() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [profiles, setProfiles] = useState<Map<string, string>>(new Map());
  const [search, setSearch] = useState("");
  const [entityFilter, setEntityFilter] = useState<string>("all");

  useEffect(() => {
    (async () => {
      const [logsRes, profilesRes] = await Promise.all([
        supabase.from("audit_logs" as any).select("*").order("created_at", { ascending: false }).limit(500),
        supabase.from("profiles").select("id, full_name"),
      ]);
      if (logsRes.data) setRows(logsRes.data as any);
      const map = new Map<string, string>();
      (profilesRes.data || []).forEach((p: any) => map.set(p.id, p.full_name || p.id));
      setProfiles(map);
    })();
  }, []);

  const filtered = rows.filter((r) => {
    const matchesEntity = entityFilter === "all" || r.entity_type === entityFilter;
    const matchesSearch = !search ||
      r.entity_type.toLowerCase().includes(search.toLowerCase()) ||
      (profiles.get(r.user_id || "") || "").toLowerCase().includes(search.toLowerCase());
    return matchesEntity && matchesSearch;
  });

  const entityTypes = Array.from(new Set(rows.map((r) => r.entity_type)));

  return (
    <AppLayout>
      <PageHeader title="سجل التدقيق" description="جميع التغييرات الحساسة على البيانات" />
      <div className="flex gap-3 mb-4">
        <Input placeholder="بحث بالمستخدم أو الجدول..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
        <Select value={entityFilter} onValueChange={setEntityFilter}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">جميع الجداول</SelectItem>
            {entityTypes.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="rounded-lg border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>التاريخ</TableHead>
              <TableHead>المستخدم</TableHead>
              <TableHead>العملية</TableHead>
              <TableHead>الجدول</TableHead>
              <TableHead>المعرّف</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">لا توجد سجلات</TableCell></TableRow>
            ) : (
              filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="text-xs text-muted-foreground" dir="ltr">{new Date(r.created_at).toLocaleString("ar-SA")}</TableCell>
                  <TableCell>{profiles.get(r.user_id || "") || "—"}</TableCell>
                  <TableCell><Badge className={actionColors[r.action] || ""}>{r.action}</Badge></TableCell>
                  <TableCell className="font-mono text-xs">{r.entity_type}</TableCell>
                  <TableCell className="font-mono text-[10px] text-muted-foreground" dir="ltr">{r.entity_id?.slice(0, 8)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">يعرض آخر 500 سجل. الوصول مقصور على المدير العام.</p>
    </AppLayout>
  );
}
