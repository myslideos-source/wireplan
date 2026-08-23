"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui";
import { useNewFloorDraftStore } from "@/features/editor/new-floor-draft-store";
import { useEditorStore } from "@/features/editor/store";
import { EditorWorkspace } from "@/features/editor/EditorWorkspace";

export default function NewFloorDraftEditorPage() {
  const draft = useNewFloorDraftStore((state) => state.draft);
  const floorId = useEditorStore((state) => state.floorId);
  const setBackgroundImage = useEditorStore((state) => state.setBackgroundImage);
  const appliedBackgroundImage = useRef(false);

  useEffect(() => {
    if (!draft?.backgroundImage) return;
    if (appliedBackgroundImage.current) return;
    if (floorId !== draft.geometry.floor.id) return;
    appliedBackgroundImage.current = true;
    setBackgroundImage(
      draft.backgroundImage.dataUrl,
      draft.backgroundImage.naturalWidth,
      draft.backgroundImage.naturalHeight,
    );
  }, [draft, floorId, setBackgroundImage]);

  if (!draft) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 px-8 py-16 text-center">
        <LayoutGrid className="h-10 w-10 text-text-muted" />
        <h1 className="text-xl font-semibold text-text">
          Kein neuer Grundriss-Entwurf vorhanden
        </h1>
        <p className="text-sm text-text-secondary">
          Dieser Entwurf lebt nur im Browser und wird bei einem Neuladen der
          Seite geleert. Legen Sie über das Projekt eine neue Etage an, um
          einen Originalplan als fixierten Hintergrund hochzuladen.
        </p>
        <Link href="/dashboard">
          <Button>Zum Dashboard</Button>
        </Link>
      </div>
    );
  }

  return <EditorWorkspace project={draft.project} geometries={[draft.geometry]} />;
}
