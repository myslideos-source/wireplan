"use client";

import type { Project } from "@/domain";
import type { FlaggedArea } from "@/features/plan-analysis/types";
import { useEditorStore } from "./store";
import { EditorWorkspace } from "./EditorWorkspace";
import { NoGeometryYet } from "./NoGeometryYet";

/**
 * §Phase17.1 — whether a project has a floor yet is client-only state (no
 * persistence layer exists — `getGeometriesForProject` is permanently
 * empty), exactly like `RoutingGate` already treats it. The editor page
 * used to gate on that always-empty server data instead, so a completely
 * ordinary navigation away and back (e.g. via the top-nav "Editor" link,
 * which re-resolves the project through the picker) always re-rendered
 * "Noch keine Etage" and offered to create a floor again — even seconds
 * after the user had just built one out — because the server-rendered
 * gate never learns what the client's in-memory store already holds.
 */
export function EditorGate({
  project,
  reviewAreas,
}: {
  project: Project;
  reviewAreas?: FlaggedArea[];
}) {
  const floorId = useEditorStore((state) => state.floorId);
  const floors = useEditorStore((state) => state.floors);
  const firstFloorProjectId = floors[0]?.floor.projectId;

  if (!floorId || firstFloorProjectId !== project.id) {
    return <NoGeometryYet project={project} />;
  }

  return (
    <EditorWorkspace project={project} geometries={floors} reviewAreas={reviewAreas} />
  );
}
