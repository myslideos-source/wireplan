import { cn } from "@/lib/utils";

export function ProgressBar({
  value,
  tone = "primary",
  className,
}: {
  value: number;
  tone?: "primary" | "success" | "warning" | "error";
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  const toneClass = {
    primary: "bg-primary",
    success: "bg-success",
    warning: "bg-warning",
    error: "bg-error",
  }[tone];

  return (
    <div
      className={cn(
        "h-1.5 w-full overflow-hidden rounded-full bg-panel-elevated",
        className,
      )}
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={cn("h-full rounded-full transition-all", toneClass)}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
