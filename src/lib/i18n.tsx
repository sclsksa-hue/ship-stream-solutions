import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type Lang = "ar" | "en";

const translations = {
  ar: {
    // App
    "app.name": "SCLS",
    "app.tagline": "سرعة وإبداع",
    // Sidebar / Nav
    "nav.dashboard": "لوحة التحكم",
    "nav.employees": "الموظفون",
    "nav.users": "إدارة المستخدمين",
    "nav.audit": "سجل التدقيق",
    "nav.integrations": "التكاملات",
    "nav.crm": "إدارة العملاء",
    "nav.leads": "العملاء المحتملون",
    "nav.customers": "العملاء",
    "nav.contacts": "جهات الاتصال",
    "nav.opportunities": "الفرص",
    "nav.quotations": "عروض الأسعار",
    "nav.requests": "طلبات العملاء",
    "nav.activities": "الأنشطة",
    "nav.tasks": "المهام",
    "nav.reports": "التقارير",
    "nav.security": "الأمان",
    // Header
    "header.search": "بحث...",
    "header.signout": "تسجيل الخروج",
    "header.language": "اللغة",
    // Common
    "common.add": "إضافة",
    "common.edit": "تعديل",
    "common.delete": "حذف",
    "common.save": "حفظ",
    "common.cancel": "إلغاء",
    "common.loading": "جاري التحميل...",
    "common.search": "بحث",
    "common.export": "تصدير",
    "common.import": "استيراد",
    "common.actions": "الإجراءات",
    "common.status": "الحالة",
    "common.yes": "نعم",
    "common.no": "لا",
    "common.confirm": "تأكيد",
    "common.noData": "لا توجد بيانات",
    // Notifications
    "notif.title": "الإشعارات",
    "notif.markAllRead": "تعيين الكل كمقروء",
    "notif.empty": "لا توجد إشعارات",
    "notif.all": "الكل",
    "notif.urgent": "عاجل",
  },
  en: {
    "app.name": "SCLS",
    "app.tagline": "Speed & Creativity",
    "nav.dashboard": "Dashboard",
    "nav.employees": "Employees",
    "nav.users": "User Management",
    "nav.audit": "Audit Logs",
    "nav.integrations": "Integrations",
    "nav.crm": "CRM",
    "nav.leads": "Leads",
    "nav.customers": "Customers",
    "nav.contacts": "Contacts",
    "nav.opportunities": "Opportunities",
    "nav.quotations": "Quotations",
    "nav.requests": "Client Requests",
    "nav.activities": "Activities",
    "nav.tasks": "Tasks",
    "nav.reports": "Reports",
    "nav.security": "Security",
    "header.search": "Search...",
    "header.signout": "Sign Out",
    "header.language": "Language",
    "common.add": "Add",
    "common.edit": "Edit",
    "common.delete": "Delete",
    "common.save": "Save",
    "common.cancel": "Cancel",
    "common.loading": "Loading...",
    "common.search": "Search",
    "common.export": "Export",
    "common.import": "Import",
    "common.actions": "Actions",
    "common.status": "Status",
    "common.yes": "Yes",
    "common.no": "No",
    "common.confirm": "Confirm",
    "common.noData": "No data",
    "notif.title": "Notifications",
    "notif.markAllRead": "Mark all as read",
    "notif.empty": "No notifications",
    "notif.all": "All",
    "notif.urgent": "Urgent",
  },
} as const;

type Key = keyof typeof translations.ar;

interface I18nCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: Key) => string;
  dir: "rtl" | "ltr";
}

const Ctx = createContext<I18nCtx | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const saved = (typeof localStorage !== "undefined" && localStorage.getItem("scls_lang")) as Lang | null;
    return saved === "en" || saved === "ar" ? saved : "ar";
  });

  useEffect(() => {
    const dir = lang === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
    document.documentElement.dataset.lang = lang;
    localStorage.setItem("scls_lang", lang);
  }, [lang]);

  const setLang = (l: Lang) => setLangState(l);
  const t = (key: Key) => (translations[lang] as Record<string, string>)[key] || key;

  return <Ctx.Provider value={{ lang, setLang, t, dir: lang === "ar" ? "rtl" : "ltr" }}>{children}</Ctx.Provider>;
}

export function useI18n() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
