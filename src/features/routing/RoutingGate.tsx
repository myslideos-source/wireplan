"use client";

import type { Project } from "@/domain";
import { useEditorStore } from "@/features/editor/store";
import { RoutingWorkspace } from "./RoutingWorkspace";
import { RoutingNotReady } from "./RoutingNotReady";

export function RoutingGate({ project }: { project: Project }) {
  const floorId = useEditorStore((state) => state.floorId);
  const firstFloorProjectId = useEditorStore((state) => state.floors[0]?.floor.projectId);

  if (!floorId || firstFloorProjectId !== project.id) {
    return <RoutingNotReady project={project} />;
  }

  return <RoutingWorkspace project={project} />;
}
