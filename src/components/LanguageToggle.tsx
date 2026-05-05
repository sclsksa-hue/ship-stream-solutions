import { Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";

export default function LanguageToggle() {
  const { lang, setLang } = useI18n();
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setLang(lang === "ar" ? "en" : "ar")}
      title={lang === "ar" ? "English" : "العربية"}
      className="gap-1.5 font-semibold"
    >
      <Languages className="h-4 w-4" />
      <span className="text-xs">{lang === "ar" ? "EN" : "AR"}</span>
    </Button>
  );
}
