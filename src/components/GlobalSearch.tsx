import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Search, UserPlus, Building2, Target, FileText } from "lucide-react";

type Result = { type: string; id: string; label: string; sub: string };

const typeLabels: Record<string, string> = {
  lead: "عميل محتمل",
  customer: "عميل",
  opportunity: "فرصة",
  quotation: "عرض سعر",
};

export default function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [show, setShow] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setShow(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (query.length < 2) { setResults([]); return; }
    const timeout = setTimeout(async () => {
      const q = `%${query}%`;
      const [leads, custs, opps, quotes] = await Promise.all([
        supabase.from("leads").select("id, company_name, contact_name, status").ilike("company_name", q).limit(5),
        supabase.from("customers").select("id, company_name, country").ilike("company_name", q).limit(5),
        supabase.from("opportunities").select("id, title, stage").ilike("title", q).limit(5),
        supabase.from("quotations").select("id, quote_number, status").ilike("quote_number", q).limit(5),
      ]);
      const r: Result[] = [
        ...(leads.data || []).map(l => ({ type: "lead", id: l.id, label: l.company_name, sub: l.contact_name })),
        ...(custs.data || []).map(c => ({ type: "customer", id: c.id, label: c.company_name, sub: c.country || "" })),
        ...(opps.data || []).map(o => ({ type: "opportunity", id: o.id, label: o.title, sub: o.stage })),
        ...(quotes.data || []).map(q => ({ type: "quotation", id: q.id, label: q.quote_number, sub: q.status })),
      ];
      setResults(r);
      setShow(r.length > 0);
    }, 300);
    return () => clearTimeout(timeout);
  }, [query]);

  const icon = (type: string) => {
    const cls = "h-4 w-4 text-muted-foreground";
    if (type === "lead") return <UserPlus className={cls} />;
    if (type === "customer") return <Building2 className={cls} />;
    if (type === "opportunity") return <Target className={cls} />;
    return <FileText className={cls} />;
  };

  const go = (r: Result) => {
    const routes: Record<string, string> = { lead: "/leads", customer: "/customers", opportunity: "/opportunities", quotation: "/quotations" };
    navigate(routes[r.type] || "/");
    setShow(false);
    setQuery("");
  };

  return (
    <div ref={ref} className="relative w-full max-w-md">
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="ابحث عن عملاء، فرص، عروض أسعار..."
          value={query}
          onChange={e => { setQuery(e.target.value); setShow(true); }}
          onFocus={() => results.length > 0 && setShow(true)}
          className="pr-9 bg-background"
        />
      </div>
      {show && results.length > 0 && (
        <div className="absolute top-full right-0 left-0 mt-1 rounded-lg border bg-popover shadow-lg z-50 max-h-80 overflow-y-auto">
          {results.map((r, i) => (
            <button
              key={`${r.type}-${r.id}-${i}`}
              onClick={() => go(r)}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-accent/10 transition-colors text-right"
            >
              {icon(r.type)}
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{r.label}</p>
                <p className="text-xs text-muted-foreground truncate">{r.sub}</p>
              </div>
              <span className="text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{typeLabels[r.type] || r.type}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
