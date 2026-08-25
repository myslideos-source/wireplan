import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface StepperStep {
  id: string;
  label: string;
  status: "done" | "active" | "pending";
}

export function Stepper({
  steps,
  className,
}: {
  steps: StepperStep[];
  className?: string;
}) {
  return (
    <ol className={cn("flex w-full items-center", className)}>
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1;
        return (
          <li
            key={step.id}
            className={cn("flex items-center", !isLast && "flex-1")}
          >
            <div className="flex flex-col items-center gap-2">
              <div
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                  step.status === "done" &&
                    "border-success bg-success/15 text-success",
                  step.status === "active" &&
                    "border-primary bg-primary/15 text-primary shadow-[0_0_0_3px_rgba(27,122,74,0.12)]",
                  step.status === "pending" &&
                    "border-border bg-panel-elevated text-text-muted",
                )}
              >
                {step.status === "done" ? (
                  <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                ) : (
                  index + 1
                )}
              </div>
              <span
                className={cn(
                  "max-w-[90px] text-center text-xs font-medium leading-tight",
                  step.status === "active" && "text-text",
                  step.status === "done" && "text-text-secondary",
                  step.status === "pending" && "text-text-muted",
                )}
              >
                {step.label}
              </span>
            </div>
            {!isLast && (
              <div
                className={cn(
                  "mx-2 mb-5 h-px flex-1",
                  step.status === "done" ? "bg-success/50" : "bg-border",
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
