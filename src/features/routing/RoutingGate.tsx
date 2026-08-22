"use client";

import type { Project } from "@/domain";
import { useEditorStore } from "@/features/editor/store";
import { RoutingWorkspace } from "./RoutingWorkspace";
import { RoutingNotReady } from "./RoutingNotReady";

export function RoutingGate({
  project,
  expectedFloorIds,
}: {
  project: Project;
  expectedFloorIds: string[];
}) {
  const floorId = useEditorStore((state) => state.floorId);

  if (!floorId || !expectedFloorIds.includes(floorId)) {
    return <RoutingNotReady project={project} />;
  }

  return <RoutingWorkspace project={project} />;
}
