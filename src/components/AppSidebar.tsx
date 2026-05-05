import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { useRole } from "@/lib/useRole";
import { useI18n } from "@/lib/i18n";
import {
  LayoutDashboard, UserPlus, Building2, Phone, Target, FileText, Activity, CheckSquare, LogOut,
  Contact, Plug, ScrollText, Inbox, BarChart3
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
import sclsLogo from "@/assets/scls-logo.png";

const generalItems = [
  { to: "/", labelKey: "nav.dashboard", icon: LayoutDashboard },
  { to: "/employees", labelKey: "nav.employees", icon: Contact },
  { to: "/audit-logs", labelKey: "nav.audit", icon: ScrollText, adminOnly: true },
  { to: "/integrations", labelKey: "nav.integrations", icon: Plug, adminOnly: true },
];

const crmItems = [
  { to: "/leads", labelKey: "nav.leads", icon: UserPlus },
  { to: "/customers", labelKey: "nav.customers", icon: Building2 },
  { to: "/contacts", labelKey: "nav.contacts", icon: Phone },
  { to: "/opportunities", labelKey: "nav.opportunities", icon: Target },
  { to: "/quotations", labelKey: "nav.quotations", icon: FileText },
  { to: "/requests", labelKey: "nav.requests", icon: Inbox },
  { to: "/activities", labelKey: "nav.activities", icon: Activity },
  { to: "/tasks", labelKey: "nav.tasks", icon: CheckSquare },
  { to: "/reports", labelKey: "nav.reports", icon: BarChart3 },
];

export default function AppSidebar() {
  const { signOut, user } = useAuth();
  const { role } = useRole();
  const location = useLocation();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { t, lang } = useI18n();

  const isActive = (to: string) =>
    to === "/" ? location.pathname === "/" : location.pathname.startsWith(to);

  const renderGroup = (items: any[]) =>
    items
      .filter((item) => !item.adminOnly || role === "admin" || role === "super_admin")
      .map((item) => {
        const label = t(item.labelKey);
        return (
          <SidebarMenuItem key={item.to}>
            <SidebarMenuButton asChild isActive={isActive(item.to)} tooltip={label}>
              <NavLink to={item.to}>
                <item.icon className="h-4 w-4" />
                <span>{label}</span>
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      });

  return (
    <Sidebar collapsible="icon" side={lang === "ar" ? "right" : "left"}>
      <SidebarHeader>
        <div className="flex items-center gap-3 px-2 py-2">
          <img src={sclsLogo} alt="SCLS Logo" className="h-8 w-8 rounded-lg object-contain flex-shrink-0" />
          {!collapsed && (
            <div className="overflow-hidden">
              <h1 className="text-sm font-bold text-sidebar-primary-foreground truncate">{t("app.name")}</h1>
              <p className="text-[10px] text-sidebar-foreground/60 leading-tight">{t("app.tagline")}</p>
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
          <SidebarGroupLabel>{t("nav.crm")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{renderGroup(crmItems)}</SidebarMenu>
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
            title="تسجيل الخروج"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
