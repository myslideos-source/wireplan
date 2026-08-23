import Link from "next/link";
import { Clock, ShieldAlert } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, Badge } from "@/components/ui";
import { isFeatureEnabled } from "@/lib/feature-flags";
import type { FlaggedArea } from "./types";

export function ReviewModeCard({
  projectId,
  flaggedAreas,
  estimatedReviewMinutes,
}: {
  projectId: string;
  flaggedAreas: FlaggedArea[];
  estimatedReviewMinutes: number;
}) {
  const reviewEnabled = isFeatureEnabled("AI_REVIEW");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Intelligenter Review-Modus</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-sm text-text-secondary">
          <span className="font-semibold text-text">
            {flaggedAreas.length} Bereiche
          </span>{" "}
          sollten geprüft werden.
        </p>
        <p className="flex items-center gap-1.5 text-xs text-text-muted">
          <Clock className="h-3.5 w-3.5" />
          Geschätzte Prüfzeit: {estimatedReviewMinutes} Minuten
        </p>

        <ul className="flex flex-col gap-2">
          {flaggedAreas.map((area, index) => (
            <li
              key={area.id}
              className="flex items-start gap-2.5 rounded-[var(--radius-sm)] border border-border bg-panel px-3 py-2.5"
            >
              <ShieldAlert
                className={
                  "mt-0.5 h-3.5 w-3.5 shrink-0 " +
                  (area.severity === "critical" ? "text-error" : "text-warning")
                }
              />
              <div className="min-w-0">
                <p className="text-xs font-medium text-text">
                  Problem {index + 1} von {flaggedAreas.length}: {area.title}
                </p>
                <p className="mt-0.5 text-xs text-text-secondary">
                  {area.description}
                </p>
              </div>
            </li>
          ))}
        </ul>

        {reviewEnabled ? (
          <Link
            href={`/editor?project=${projectId}&review=1`}
            className="flex items-center justify-center gap-2 rounded-[var(--radius-sm)] bg-secondary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-secondary/90"
          >
            Jetzt prüfen
          </Link>
        ) : (
          <>
            <button
              type="button"
              disabled
              title="Der interaktive Review-Modus folgt in Phase 4 — Demnächst"
              className="flex items-center justify-center gap-2 rounded-[var(--radius-sm)] bg-secondary px-4 py-2 text-sm font-medium text-white disabled:pointer-events-none disabled:opacity-50"
            >
              Jetzt prüfen — Demnächst
            </button>
            <Badge tone="neutral" className="self-start">
              Phase 4 · AI_REVIEW
            </Badge>
          </>
        )}
      </CardContent>
    </Card>
  );
}
