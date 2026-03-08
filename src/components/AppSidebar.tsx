import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import {
  LayoutDashboard, UserPlus, Building2, Phone, Target, FileText, Activity, CheckSquare, LogOut, Ship,
  Package, MapPin, FileArchive, Users, BarChart3
} from "lucide-react";
import { Separator } from "@/components/ui/separator";

const crmItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/leads", label: "Leads", icon: UserPlus },
  { to: "/customers", label: "Customers", icon: Building2 },
  { to: "/contacts", label: "Contacts", icon: Phone },
  { to: "/opportunities", label: "Opportunities", icon: Target },
  { to: "/quotations", label: "Quotations", icon: FileText },
  { to: "/activities", label: "Activities", icon: Activity },
  { to: "/tasks", label: "Tasks", icon: CheckSquare },
];

const tmsItems = [
  { to: "/shipments", label: "Shipments", icon: Ship },
  { to: "/documents", label: "Documents", icon: FileArchive },
  { to: "/agents", label: "Agents", icon: Users },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
];

export default function AppSidebar() {
  const { signOut, user } = useAuth();
  const location = useLocation();

  const link = ({ to, label, icon: Icon }: typeof crmItems[0]) => {
    const isActive = to === "/" ? location.pathname === "/" : location.pathname.startsWith(to);
    return (
      <NavLink
        key={to}
        to={to}
        className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
          isActive
            ? "bg-sidebar-accent text-sidebar-primary-foreground"
            : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
        }`}
      >
        <Icon className="h-4 w-4" />
        {label}
      </NavLink>
    );
  };

  return (
    <aside className="fixed inset-y-0 left-0 z-30 flex w-64 flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-primary">
          <Ship className="h-5 w-5 text-sidebar-primary-foreground" />
        </div>
        <div>
          <h1 className="font-display text-base font-bold text-sidebar-primary-foreground">SCLS</h1>
          <p className="text-[10px] text-sidebar-foreground/60 leading-tight">Speed & Creativity</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        <p className="px-3 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40 mb-2">CRM</p>
        {crmItems.map(link)}
        <Separator className="my-3 bg-sidebar-border" />
        <p className="px-3 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40 mb-2">TMS</p>
        {tmsItems.map(link)}
      </nav>

      <div className="border-t border-sidebar-border p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs text-sidebar-foreground/60 truncate max-w-[160px]">{user?.email}</span>
          <button onClick={signOut} className="rounded-md p-1.5 text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
