import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, UserPlus, Building2, Target, FileText, Ship } from "lucide-react";

export default function QuickActions() {
  const navigate = useNavigate();

  const actions = [
    { label: "New Lead", icon: UserPlus, path: "/leads" },
    { label: "New Customer", icon: Building2, path: "/customers" },
    { label: "New Opportunity", icon: Target, path: "/opportunities" },
    { label: "New Quotation", icon: FileText, path: "/quotations" },
    { label: "New Shipment", icon: Ship, path: "/shipments" },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" />
          Quick Add
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
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
