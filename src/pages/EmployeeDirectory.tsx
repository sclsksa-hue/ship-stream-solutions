import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import PageHeader from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Search, Phone, Mail, Building2 } from "lucide-react";

type Employee = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  position: string | null;
  department: string | null;
  is_active: boolean;
  created_at: string;
  role?: string;
};

const roleColors: Record<string, string> = {
  admin: "bg-destructive/10 text-destructive",
  sales: "bg-blue-500/10 text-blue-600",
  operations: "bg-amber-500/10 text-amber-600",
  viewer: "bg-muted text-muted-foreground",
};

export default function EmployeeDirectory() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function load() {
      const [profilesRes, rolesRes] = await Promise.all([
        supabase.from("profiles").select("*").order("full_name"),
        supabase.from("user_roles").select("user_id, role"),
      ]);

      const roleMap = new Map<string, string>();
      (rolesRes.data || []).forEach((r: any) => roleMap.set(r.user_id, r.role));

      const data = (profilesRes.data || []).map((p: any) => ({
        ...p,
        role: roleMap.get(p.id) || "viewer",
      }));
      setEmployees(data);
    }
    load();
  }, []);

  const filtered = employees.filter(
    (e) =>
      e.is_active &&
      (e.full_name.toLowerCase().includes(search.toLowerCase()) ||
        (e.email || "").toLowerCase().includes(search.toLowerCase()) ||
        (e.department || "").toLowerCase().includes(search.toLowerCase()) ||
        (e.position || "").toLowerCase().includes(search.toLowerCase()))
  );

  const initials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  return (
    <AppLayout>
      <PageHeader title="Employee Directory" description="View team members and their contact information" />

      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, department..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Badge variant="secondary">{filtered.length} employees</Badge>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Position</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Joined</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No employees found
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((emp) => (
                <TableRow key={emp.id} className="animate-fade-in">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                          {initials(emp.full_name || "?")}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{emp.full_name || "—"}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{emp.position || "—"}</TableCell>
                  <TableCell>
                    {emp.department ? (
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Building2 className="h-3.5 w-3.5" />
                        {emp.department}
                      </div>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge className={roleColors[emp.role || "viewer"]}>
                      {(emp.role || "viewer").charAt(0).toUpperCase() + (emp.role || "viewer").slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                      {emp.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" /> {emp.email}
                        </span>
                      )}
                      {emp.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" /> {emp.phone}
                        </span>
                      )}
                      {!emp.email && !emp.phone && "—"}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(emp.created_at).toLocaleDateString()}
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
