import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, UserPlus, Building2, Target, FileText } from "lucide-react";

export default function QuickActions() {
  const navigate = useNavigate();

  const actions = [
    { label: "عميل محتمل جديد", icon: UserPlus, path: "/leads" },
    { label: "عميل جديد", icon: Building2, path: "/customers" },
    { label: "فرصة جديدة", icon: Target, path: "/opportunities" },
    { label: "عرض سعر جديد", icon: FileText, path: "/quotations" },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" />
          إضافة سريعة
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        {actions.map(a => (
          <DropdownMenuItem key={a.label} onClick={() => navigate(a.path)} className="gap-2 cursor-pointer">
            <a.icon className="h-4 w-4" />
            {a.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
