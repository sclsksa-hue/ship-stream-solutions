import { ReactNode } from "react";
import AppSidebar from "./AppSidebar";
import GlobalSearch from "./GlobalSearch";
import QuickActions from "./QuickActions";
import NotificationBell from "./NotificationBell";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <main className="pl-64">
        <div className="sticky top-0 z-20 flex items-center gap-3 border-b bg-background/95 backdrop-blur px-6 lg:px-8 py-3">
          <GlobalSearch />
          <div className="ml-auto flex items-center gap-3">
            <NotificationBell />
            <QuickActions />
          </div>
        </div>
        <div className="p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
