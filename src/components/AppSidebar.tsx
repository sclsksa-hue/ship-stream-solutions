import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { useRole } from "@/lib/useRole";
import {
  LayoutDashboard, UserPlus, Building2, Phone, Target, FileText, Activity, CheckSquare, LogOut, Ship,
  FileArchive, Users, BarChart3, Shield, Warehouse, Settings, Contact
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import sclsLogo from "@/assets/scls-logo.png";

const generalItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/employees", label: "Employees", icon: Contact },
  { to: "/users", label: "User Management", icon: Settings },
];

const crmItems = [
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
  { to: "/customs", label: "Customs", icon: Shield },
  { to: "/warehousing", label: "Warehousing", icon: Warehouse },
  { to: "/documents", label: "Documents", icon: FileArchive },
  { to: "/agents", label: "Agents", icon: Users },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
];

export default function AppSidebar() {
  const { signOut, user } = useAuth();
  const { role } = useRole();
  const location = useLocation();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  const isActive = (to: string) =>
    to === "/" ? location.pathname === "/" : location.pathname.startsWith(to);

  const renderGroup = (items: typeof crmItems) =>
    items.map((item) => (
      <SidebarMenuItem key={item.to}>
        <SidebarMenuButton
          asChild
          isActive={isActive(item.to)}
          tooltip={item.label}
        >
          <NavLink to={item.to}>
            <item.icon className="h-4 w-4" />
            <span>{item.label}</span>
          </NavLink>
        </SidebarMenuButton>
      </SidebarMenuItem>
    ));

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-3 px-2 py-2">
          <img src={sclsLogo} alt="SCLS Logo" className="h-8 w-8 rounded-lg object-contain flex-shrink-0" />
          {!collapsed && (
            <div className="overflow-hidden">
              <h1 className="text-sm font-bold text-sidebar-primary-foreground truncate">SCLS</h1>
              <p className="text-[10px] text-sidebar-foreground/60 leading-tight">Speed & Creativity</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>{renderGroup(generalItems)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>CRM</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{renderGroup(crmItems)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>TMS</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{renderGroup(tmsItems)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <div className="flex items-center justify-between px-2 py-2">
          {!collapsed && (
            <div className="flex flex-col truncate max-w-[140px]">
              <span className="text-xs text-sidebar-foreground/60 truncate">{user?.email}</span>
              {role && <span className="text-[10px] text-sidebar-foreground/40 capitalize">{role}</span>}
            </div>
          )}
          <button
            onClick={signOut}
            className="rounded-md p-1.5 text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors flex-shrink-0"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
