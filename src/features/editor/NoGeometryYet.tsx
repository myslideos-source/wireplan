"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Building2 } from "lucide-react";
import { Card } from "@/components/ui";
import type { Project } from "@/domain";
import { StartFloorDialog, type StartFloorInput } from "./StartFloorDialog";
import { useNewFloorDraftStore } from "./new-floor-draft-store";
import type { FloorGeometry } from "./mock-geometry";

let nextDraftFloorId = 1;

export function NoGeometryYet({ project }: { project: Project }) {
  const router = useRouter();
  const setDraft = useNewFloorDraftStore((state) => state.setDraft);

  function handleCreate(input: StartFloorInput) {
    const geometry: FloorGeometry = {
      floor: {
        id: `floor-draft-${nextDraftFloorId++}`,
        projectId: project.id,
        name: input.name,
        level: input.level,
      },
      rooms: [],
    };
    setDraft({ project, geometry, backgroundImage: input.backgroundImage });
    router.push("/editor/draft");
  }

  return (
    <div className="flex h-full items-center justify-center p-8">
      <Card className="flex max-w-md flex-col items-center gap-4 px-8 py-10 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary/10 text-secondary">
          <Building2 className="h-6 w-6" />
        </span>
        <div>
          <h2 className="text-base font-semibold text-text">
            Noch keine Etage für {project.name}
          </h2>
          <p className="mt-2 text-sm text-text-secondary">
            Legen Sie eine Etage an und laden Sie optional Ihren Originalplan
            als fixierten Hintergrund hoch — er wird nie automatisch neu
            gezeichnet oder interpretiert.
          </p>
        </div>
        <StartFloorDialog
          suggestedName="Erdgeschoss"
          suggestedLevel={0}
          triggerLabel="Etage anlegen"
          onCreate={handleCreate}
        />
        <Link
          href="/dashboard"
          className="text-sm font-medium text-primary hover:underline"
        >
          Zum Dashboard
        </Link>
      </Card>
    </div>
  );
}
