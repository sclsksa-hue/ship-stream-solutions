import { ReactNode } from "react";
import AppSidebar from "./AppSidebar";
import GlobalSearch from "./GlobalSearch";
import QuickActions from "./QuickActions";
import NotificationBell from "./NotificationBell";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { useActivityTracker } from "@/lib/useActivityTracker";

export default function AppLayout({ children }: { children: ReactNode }) {
  useActivityTracker();
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="sticky top-0 z-20 flex items-center gap-3 border-b bg-background/95 backdrop-blur px-4 lg:px-8 py-3">
            <SidebarTrigger className="mr-1" />
            <GlobalSearch />
            <div className="ml-auto flex items-center gap-3">
              <NotificationBell />
              <QuickActions />
            </div>
          </header>
          <main className="flex-1 p-4 lg:p-8">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
