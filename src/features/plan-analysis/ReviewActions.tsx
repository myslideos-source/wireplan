"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { useProjectsStore } from "@/features/projects/store";

export function ReviewActions({
  projectId,
  hasCriticalIssues,
}: {
  projectId: string;
  hasCriticalIssues: boolean;
}) {
  const router = useRouter();
  const advanceToValidation = useProjectsStore(
    (state) => state.advanceToValidation,
  );
  const [accepted, setAccepted] = React.useState(false);
  const reviewEnabled = isFeatureEnabled("AI_REVIEW");

  function handleAccept() {
    advanceToValidation(projectId);
    setAccepted(true);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="flex items-center gap-1.5 text-xs text-text-muted">
        {accepted ? (
          <>
            <CheckCircle2 className="h-3.5 w-3.5 text-success" />
            Übernommen — Projekt ist jetzt in Validierung.
          </>
        ) : (
          "Prüfen Sie die markierten Bereiche, bevor Sie fortfahren."
        )}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          disabled={!reviewEnabled}
          title={
            !reviewEnabled
              ? "Manuelle Korrekturwerkzeuge folgen in Phase 4 — Demnächst"
              : undefined
          }
        >
          {reviewEnabled ? "Manuell korrigieren" : "Manuell korrigieren — Demnächst"}
        </Button>
        {hasCriticalIssues ? (
          <Button
            disabled={!reviewEnabled}
            title={
              !reviewEnabled
                ? "Der geführte Fehler-Review folgt in Phase 4 — Demnächst"
                : undefined
            }
          >
            <AlertTriangle className="h-4 w-4" />
            {reviewEnabled ? "Fehler prüfen" : "Fehler prüfen — Demnächst"}
          </Button>
        ) : (
          <Button onClick={handleAccept} disabled={accepted}>
            <CheckCircle2 className="h-4 w-4" />
            {accepted ? "Übernommen" : "Grundriss übernehmen"}
          </Button>
        )}
      </div>
    </div>
  );
}
