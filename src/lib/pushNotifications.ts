import { supabase } from "@/integrations/supabase/client";

// Public VAPID key (safe to ship in client)
export const VAPID_PUBLIC_KEY =
  "BFosADpIYy2Fa4prbrVY7SKvgmo9-yHF43_-viu6Sb1S-wy5ar9awC-IxYS5UlByN-tOdz4l8Dd4cIfUnwFd1DI";

function urlBase64ToUint8Array(b64: string): Uint8Array {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const base64 = (b64 + pad).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

function abToB64Url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function isPushSupported(): boolean {
  return typeof window !== "undefined"
    && "serviceWorker" in navigator
    && "PushManager" in window
    && "Notification" in window;
}

export async function getPushStatus(): Promise<"granted" | "denied" | "default" | "unsupported"> {
  if (!isPushSupported()) return "unsupported";
  return Notification.permission;
}

export async function subscribeToPush(): Promise<boolean> {
  if (!isPushSupported()) throw new Error("متصفحك لا يدعم الإشعارات");
  const reg = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;

  const perm = await Notification.requestPermission();
  if (perm !== "granted") throw new Error("تم رفض الإذن. فعّله من إعدادات المتصفح.");

  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY).buffer as ArrayBuffer,
    });
  }

  const json = sub.toJSON();
  const p256dh = json.keys?.p256dh as string;
  const auth = json.keys?.auth as string;
  if (!p256dh || !auth) throw new Error("فشل في الحصول على مفاتيح الاشتراك");

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("يجب تسجيل الدخول أولاً");

  // Upsert by endpoint
  const { error } = await supabase.from("push_subscriptions").upsert({
    user_id: user.id,
    endpoint: sub.endpoint,
    p256dh,
    auth,
    user_agent: navigator.userAgent.slice(0, 200),
    last_used_at: new Date().toISOString(),
  }, { onConflict: "endpoint" });
  if (error) throw error;
  return true;
}

export async function unsubscribeFromPush(): Promise<void> {
  if (!isPushSupported()) return;
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (sub) {
    await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
    await sub.unsubscribe();
  }
}
