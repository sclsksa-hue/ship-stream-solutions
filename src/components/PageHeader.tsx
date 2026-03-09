import { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

export default function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">{title}</h1>
        {description && <p className="mt-1.5 text-sm text-muted-foreground max-w-lg">{description}</p>}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}
