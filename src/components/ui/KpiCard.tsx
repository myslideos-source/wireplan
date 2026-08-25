import * as React from "react";
import { Card } from "./Card";
import { cn } from "@/lib/utils";

export function KpiCard({
  label,
  value,
  icon,
  color = "var(--color-primary)",
  className,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  /** Accent color tying the icon badge and top edge together, so a row of
   * KPIs reads as distinct metrics at a glance instead of identical boxes. */
  color?: string;
  className?: string;
}) {
  return (
    <Card className={cn("relative overflow-hidden px-4 py-4", className)}>
      <span
        className="absolute inset-x-0 top-0 h-[3px]"
        style={{ background: color }}
        aria-hidden
      />
      <div className="flex items-center gap-3">
        {icon && (
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)]"
            style={{
              background: `color-mix(in srgb, ${color} 14%, transparent)`,
              color,
            }}
          >
            {icon}
          </span>
        )}
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
            {label}
          </p>
          <p className="tabular-nums-font mt-0.5 text-2xl font-semibold text-text">
            {value}
          </p>
        </div>
      </div>
    </Card>
  );
}
