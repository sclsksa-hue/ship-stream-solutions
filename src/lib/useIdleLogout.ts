import { useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

const IDLE_MS = 30 * 60 * 1000; // 30 minutes

export function useIdleLogout() {
  const { session, signOut } = useAuth();
  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (!session) return;
    const reset = () => {
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(async () => {
        toast.warning("تم تسجيل الخروج تلقائياً بسبب عدم النشاط");
        await signOut();
      }, IDLE_MS);
    };
    const events = ["mousemove", "mousedown", "keydown", "touchstart", "scroll"];
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => {
      events.forEach((e) => window.removeEventListener(e, reset));
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [session, signOut]);
}
