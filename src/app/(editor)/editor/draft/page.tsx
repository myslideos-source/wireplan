"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui";
import { useAiDraftStore } from "@/features/plan-analysis/ai-draft-store";
import { EditorWorkspace } from "@/features/editor/EditorWorkspace";

export default function AiDraftEditorPage() {
  const draft = useAiDraftStore((state) => state.draft);

  if (!draft) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 px-8 py-16 text-center">
        <Sparkles className="h-10 w-10 text-text-muted" />
        <h1 className="text-xl font-semibold text-text">
          Kein KI-Geometrie-Entwurf vorhanden
        </h1>
        <p className="text-sm text-text-secondary">
          Dieser Entwurf lebt nur im Browser und wird bei einem Neuladen der
          Seite geleert. Laden Sie über das Dashboard einen Grundriss hoch,
          um einen neuen Entwurf zu erzeugen.
        </p>
        <Link href="/dashboard">
          <Button>Zum Dashboard</Button>
        </Link>
      </div>
    );
  }

  return (
    <EditorWorkspace
      project={draft.project}
      geometry={draft.geometry}
      reviewAreas={draft.flaggedAreas}
    />
  );
}
