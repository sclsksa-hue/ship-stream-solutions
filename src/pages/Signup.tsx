import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import sclsLogo from "@/assets/scls-logo.png";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: window.location.origin,
      },
    });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("تحقق من بريدك الإلكتروني لتأكيد حسابك");
      navigate("/login");
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
          <CardTitle className="font-display text-2xl">انضم إلى SCLS</CardTitle>
          <CardDescription>أنشئ حسابك للبدء</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignup} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">الاسم الكامل</Label>
              <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="محمد أحمد" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">البريد الإلكتروني</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@scls.com" required dir="ltr" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">كلمة المرور</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required minLength={6} dir="ltr" />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "جاري إنشاء الحساب..." : "إنشاء حساب"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              لديك حساب بالفعل؟ <Link to="/login" className="text-primary hover:underline font-medium">تسجيل الدخول</Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
