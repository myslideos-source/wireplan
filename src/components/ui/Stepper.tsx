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
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold transition-colors",
                  step.status === "done" &&
                    "border-success bg-success text-white",
                  step.status === "active" &&
                    "border-primary bg-primary text-white shadow-[0_0_0_5px_rgba(27,122,74,0.16)]",
                  step.status === "pending" &&
                    "border-border bg-panel-elevated text-text-muted",
                )}
              >
                {step.status === "done" ? (
                  <Check className="h-4 w-4" strokeWidth={3} />
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
                  "mx-2 mb-5 h-[3px] flex-1 rounded-full",
                  step.status === "done" ? "bg-success" : "bg-border",
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
