import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import sclsLogo from "@/assets/scls-logo.png";
import { getLockoutRemainingMs, recordFailedAttempt, clearAttempts } from "@/lib/loginRateLimit";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [honeypot, setHoneypot] = useState(""); // bot trap
  const [loading, setLoading] = useState(false);
  const [lockMs, setLockMs] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    if (!email) { setLockMs(0); return; }
    const tick = () => setLockMs(getLockoutRemainingMs(email));
    tick();
    const i = setInterval(tick, 1000);
    return () => clearInterval(i);
  }, [email]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (honeypot) return; // silently drop bots
    if (lockMs > 0) {
      toast.error(`الحساب مقفل مؤقتاً. حاول بعد ${Math.ceil(lockMs / 60000)} دقيقة`);
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      const r = recordFailedAttempt(email);
      if (r.locked) toast.error("تم قفل الحساب لمدة 15 دقيقة بسبب محاولات فاشلة متكررة");
      else toast.error(`${error.message} — محاولات متبقية: ${r.attemptsLeft}`);
    } else {
      clearAttempts(email);
      navigate("/");
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md animate-fade-in">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <img src={sclsLogo} alt="SCLS Logo" className="h-16 w-16 rounded-xl object-contain mx-auto" />
          </div>
          <CardTitle className="font-display text-2xl">مرحباً بك في SCLS</CardTitle>
          <CardDescription>سرعة وإبداع في الخدمات اللوجستية</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">البريد الإلكتروني</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@scls.com" required dir="ltr" autoComplete="username" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">كلمة المرور</Label>
                <Link to="/forgot-password" className="text-xs text-muted-foreground hover:text-primary transition-colors">نسيت كلمة المرور؟</Link>
              </div>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required dir="ltr" autoComplete="current-password" />
            </div>
            {/* Honeypot — hidden from real users, bots fill it */}
            <div aria-hidden="true" style={{ position: "absolute", left: "-10000px", top: "auto", width: 1, height: 1, overflow: "hidden" }}>
              <label htmlFor="company_website">Company Website</label>
              <input id="company_website" name="company_website" type="text" tabIndex={-1} autoComplete="off" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} />
            </div>
            {lockMs > 0 && (
              <p className="text-sm text-destructive text-center">
                الحساب مقفل. تبقى {Math.ceil(lockMs / 60000)} دقيقة
              </p>
            )}
            <Button type="submit" className="w-full" disabled={loading || lockMs > 0}>
              {loading ? "جاري تسجيل الدخول..." : "تسجيل الدخول"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              ليس لديك حساب؟ <Link to="/signup" className="text-primary hover:underline font-medium">إنشاء حساب</Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
