"use client";

import { AlertTriangle, AlertCircle, Info } from "lucide-react";
import type { PlanWarning } from "@/features/editor/warnings";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui";
import { cn } from "@/lib/utils";

/**
 * §24 (mockup) — a compact "Letzte Warnungen" card, not a full-width
 * banner. Tone is derived from the warning's own id prefix (already a
 * real distinction the two warning-computing functions produce — an
 * over-limit branch vs. an unassigned device vs. a legacy product), not
 * a fabricated severity field: overcount/overlength are the closest
 * thing this data model has to "kritisch", legacy products are an
 * advisory "Hinweis", everything else is a plain "Warnung".
 */
function toneFor(warning: PlanWarning): "error" | "primary" | "warning" {
  if (warning.id.startsWith("overcount-") || warning.id.startsWith("overlength-")) return "error";
  if (warning.id.startsWith("legacy-")) return "primary";
  return "warning";
}

const TONE_ICON = { error: AlertCircle, primary: Info, warning: AlertTriangle } as const;
const TONE_COLOR = {
  error: "text-error",
  primary: "text-secondary",
  warning: "text-warning",
} as const;

export function WarningsCard({ warnings }: { warnings: PlanWarning[] }) {
  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle className="text-sm">Letzte Warnungen</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-2.5">
        {warnings.length === 0 ? (
          <p className="text-xs text-text-muted">Keine Warnungen — alles sieht gut aus.</p>
        ) : (
          warnings.slice(0, 5).map((warning) => {
            const tone = toneFor(warning);
            const Icon = TONE_ICON[tone];
            return (
              <div key={warning.id} className="flex items-start gap-2 text-xs">
                <Icon className={cn("mt-0.5 h-3.5 w-3.5 shrink-0", TONE_COLOR[tone])} />
                <span className="text-text-secondary">{warning.message}</span>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
