"use client";

import type { Project } from "@/domain";
import { useEditorStore } from "@/features/editor/store";
import { ExportsWorkspace } from "./ExportsWorkspace";
import { ExportsNotReady } from "./ExportsNotReady";

export function ExportsGate({
  project,
  expectedFloorIds,
}: {
  project: Project;
  expectedFloorIds: string[];
}) {
  const floorId = useEditorStore((state) => state.floorId);

  if (!floorId || !expectedFloorIds.includes(floorId)) {
    return <ExportsNotReady project={project} />;
  }

  return <ExportsWorkspace project={project} />;
}
