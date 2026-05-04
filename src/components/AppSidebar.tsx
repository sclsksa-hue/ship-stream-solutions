import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { useRole } from "@/lib/useRole";
import {
  LayoutDashboard, UserPlus, Building2, Phone, Target, FileText, Activity, CheckSquare, LogOut,
  Settings, Contact, Plug, ScrollText
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
  { to: "/", label: "لوحة التحكم", icon: LayoutDashboard },
  { to: "/employees", label: "الموظفون", icon: Contact },
  { to: "/users", label: "إدارة المستخدمين", icon: Settings, adminOnly: true },
  { to: "/audit-logs", label: "سجل التدقيق", icon: ScrollText, adminOnly: true },
  { to: "/integrations", label: "التكاملات", icon: Plug, adminOnly: true },
];

const crmItems = [
  { to: "/leads", label: "العملاء المحتملون", icon: UserPlus },
  { to: "/customers", label: "العملاء", icon: Building2 },
  { to: "/contacts", label: "جهات الاتصال", icon: Phone },
  { to: "/opportunities", label: "الفرص", icon: Target },
  { to: "/quotations", label: "عروض الأسعار", icon: FileText },
  { to: "/activities", label: "الأنشطة", icon: Activity },
  { to: "/tasks", label: "المهام", icon: CheckSquare },
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
    <Sidebar collapsible="icon" side="right">
      <SidebarHeader>
        <div className="flex items-center gap-3 px-2 py-2">
          <img src={sclsLogo} alt="SCLS Logo" className="h-8 w-8 rounded-lg object-contain flex-shrink-0" />
          {!collapsed && (
            <div className="overflow-hidden">
              <h1 className="text-sm font-bold text-sidebar-primary-foreground truncate">SCLS</h1>
              <p className="text-[10px] text-sidebar-foreground/60 leading-tight">سرعة وإبداع</p>
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
          <SidebarGroupLabel>إدارة العملاء</SidebarGroupLabel>
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
