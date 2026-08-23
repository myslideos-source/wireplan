"use client";

import * as React from "react";
import Link from "next/link";
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
        <Link
          href={`/editor?project=${projectId}`}
          className="inline-flex h-9 items-center gap-2 rounded-[var(--radius-sm)] border border-border px-4 text-sm font-medium text-text transition-colors hover:border-primary/60 hover:text-primary"
        >
          Manuell korrigieren
        </Link>
        {hasCriticalIssues ? (
          reviewEnabled ? (
            <Link
              href={`/editor?project=${projectId}&review=1`}
              className="inline-flex h-9 items-center gap-2 rounded-[var(--radius-sm)] bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary/90"
            >
              <AlertTriangle className="h-4 w-4" />
              Fehler prüfen
            </Link>
          ) : (
            <Button disabled title="Der geführte Fehler-Review folgt in Phase 4 — Demnächst">
              <AlertTriangle className="h-4 w-4" />
              Fehler prüfen — Demnächst
            </Button>
          )
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
