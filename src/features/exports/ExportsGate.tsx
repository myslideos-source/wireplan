"use client";

import type { Project } from "@/domain";
import { useEditorStore } from "@/features/editor/store";
import { ExportsWorkspace } from "./ExportsWorkspace";
import { ExportsNotReady } from "./ExportsNotReady";

export function ExportsGate({ project }: { project: Project }) {
  const floorId = useEditorStore((state) => state.floorId);
  const firstFloorProjectId = useEditorStore((state) => state.floors[0]?.floor.projectId);

  if (!floorId || firstFloorProjectId !== project.id) {
    return <ExportsNotReady project={project} />;
  }

  return <ExportsWorkspace project={project} />;
}
