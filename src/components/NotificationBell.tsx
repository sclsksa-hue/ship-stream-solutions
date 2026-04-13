import { useEffect, useState } from "react";
import { Bell, Check, Filter } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useRole } from "@/lib/useRole";
import { supabase } from "@/integrations/supabase/client";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";

type Notification = {
  id: string;
  title: string;
  message: string;
  type: string;
  priority: string;
  is_read: boolean;
  created_at: string;
};

const ROLE_TYPE_MAP: Record<string, string[]> = {
  admin: ["alert", "quotation", "lead", "info"],
  sales: ["lead", "quotation", "info"],
  operations: ["quotation", "info"],
  viewer: ["info"],
};

export default function NotificationBell() {
  const { user } = useAuth();
  const { role } = useRole();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => {
    if (!user) return;

    const fetchNotifications = async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      
      if (!error && data) {
        setNotifications(data);
        setUnreadCount(data.filter((n) => !n.is_read).length);
      }
    };

    fetchNotifications();

    const channel = supabase
      .channel("schema-db-changes")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (payload) => {
          const newNotif = payload.new as Notification;
          setNotifications((prev) => [newNotif, ...prev].slice(0, 50));
          setUnreadCount((prev) => prev + 1);
        }
      )
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (payload) => {
          const updatedNotif = payload.new as Notification;
          setNotifications((prev) => prev.map((n) => (n.id === updatedNotif.id ? updatedNotif : n)));
          setUnreadCount((prev) => {
            const currentUnread = payload.old.is_read === false;
            const newUnread = payload.new.is_read === false;
            if (currentUnread && !newUnread) return Math.max(0, prev - 1);
            if (!currentUnread && newUnread) return prev + 1;
            return prev;
          });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const markAsRead = async (id: string) => {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
  };

  const markAllAsRead = async () => {
    if (!user) return;
    await supabase.from("notifications").update({ is_read: true }).eq("user_id", user.id).eq("is_read", false);
  };

  const relevantTypes = role ? ROLE_TYPE_MAP[role] || ROLE_TYPE_MAP.viewer : [];
  
  const filteredNotifications = activeTab === "all"
    ? notifications
    : activeTab === "relevant"
      ? notifications.filter((n) => relevantTypes.includes(n.type))
      : notifications.filter((n) => n.priority === "high");

  const typeIcon = (type: string) => {
    switch (type) {
      case "lead": return "🎯";
      case "quotation": return "📄";
      case "alert": return "⚠️";
      default: return "ℹ️";
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge variant="destructive" className="absolute -top-1 -left-1 h-5 w-5 flex items-center justify-center rounded-full p-0 text-xs">
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="start">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div>
            <h4 className="font-semibold text-sm">الإشعارات</h4>
            {role && <p className="text-[10px] text-muted-foreground capitalize">{role}</p>}
          </div>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllAsRead} className="h-auto px-2 py-1 text-xs">
              <Check className="ml-1 h-3 w-3" /> تعيين الكل كمقروء
            </Button>
          )}
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full rounded-none border-b bg-transparent h-9">
            <TabsTrigger value="all" className="text-xs flex-1 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">الكل</TabsTrigger>
            <TabsTrigger value="relevant" className="text-xs flex-1 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
              <Filter className="ml-1 h-3 w-3" /> حسب الدور
            </TabsTrigger>
            <TabsTrigger value="urgent" className="text-xs flex-1 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">🔴 عاجل</TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[320px]">
            {filteredNotifications.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">لا توجد إشعارات</div>
            ) : (
              <div className="flex flex-col">
                {filteredNotifications.map((n) => (
                  <div key={n.id} className={`p-3 border-b last:border-0 transition-colors hover:bg-muted/50 cursor-pointer ${!n.is_read ? "bg-primary/5" : ""}`} onClick={() => { if (!n.is_read) markAsRead(n.id); }}>
                    <div className="flex items-start gap-2.5">
                      <span className="text-sm mt-0.5">{typeIcon(n.type)}</span>
                      <div className="flex-1 min-w-0 space-y-0.5">
                        <div className="flex items-center gap-2">
                          <p className={`text-sm font-medium leading-none truncate ${!n.is_read ? "text-foreground" : "text-muted-foreground"}`}>{n.title}</p>
                          {n.priority === "high" && <Badge variant="destructive" className="h-4 text-[9px] px-1">عاجل</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">{n.message}</p>
                        <span className="text-[10px] text-muted-foreground/70">
                          {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: ar })}
                        </span>
                      </div>
                      {!n.is_read && <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}
