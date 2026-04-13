import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import sclsLogo from "@/assets/scls-logo.png";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="text-center max-w-md">
        <div className="mx-auto mb-6">
          <img src={sclsLogo} alt="SCLS Logo" className="h-16 w-16 mx-auto rounded-2xl object-contain" />
        </div>
        <h1 className="font-display text-6xl font-bold text-foreground mb-2">404</h1>
        <p className="text-lg text-muted-foreground mb-6">
          هذه الصفحة غير موجودة أو ليس لديك صلاحية الوصول إليها.
        </p>
        <Button asChild>
          <Link to="/">العودة للوحة التحكم</Link>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
