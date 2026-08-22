import * as React from "react";
import { Card } from "./Card";
import { cn } from "@/lib/utils";

export function KpiCard({
  label,
  value,
  icon,
  className,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("px-4 py-4", className)}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
          {label}
        </p>
        {icon && <span className="text-text-muted">{icon}</span>}
      </div>
      <p className="tabular-nums-font mt-2 text-2xl font-semibold text-text">
        {value}
      </p>
    </Card>
  );
}
