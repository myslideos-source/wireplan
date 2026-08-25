"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import type { Project } from "@/domain";
import type { FlaggedArea } from "@/features/plan-analysis/types";
import { useEditorStore } from "./store";
import { EditorWorkspace } from "./EditorWorkspace";
import { NoGeometryYet } from "./NoGeometryYet";

/**
 * §Phase17.1 — whether a project has a floor yet is client-only state
 * (nothing server-rendered can know it), exactly like `RoutingGate`
 * already treats it. The editor page used to gate on always-empty server
 * data instead, so a completely ordinary navigation away and back (e.g.
 * via the top-nav "Editor" link, which re-resolves the project through
 * the picker) always re-rendered "Noch keine Etage" — even seconds after
 * the user had just built one out — because the server-rendered gate
 * never learns what the client's in-memory store already holds.
 *
 * §106 — floors can now also come from Supabase (when configured), not
 * only from this session's in-memory store, so a first render on a fresh
 * page load waits for that lookup before deciding "no floor" — otherwise
 * a project with real saved floors would flash "Noch keine Etage" for a
 * moment on every reload.
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
  const hydrateFromSupabase = useEditorStore((state) => state.hydrateFromSupabase);
  const firstFloorProjectId = floors[0]?.floor.projectId;
  const [checkedProjectId, setCheckedProjectId] = useState<string | null>(
    firstFloorProjectId === project.id ? project.id : null,
  );

  useEffect(() => {
    if (firstFloorProjectId === project.id) return;
    if (checkedProjectId === project.id) return;
    let cancelled = false;
    hydrateFromSupabase(project.id).finally(() => {
      if (!cancelled) setCheckedProjectId(project.id);
    });
    return () => {
      cancelled = true;
    };
  }, [project.id, firstFloorProjectId, checkedProjectId, hydrateFromSupabase]);

  const ready = firstFloorProjectId === project.id || checkedProjectId === project.id;
  if (!ready) {
    return (
      <div className="flex h-full w-full items-center justify-center text-text-muted">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (!floorId || firstFloorProjectId !== project.id) {
    return <NoGeometryYet project={project} />;
  }

  return (
    <EditorWorkspace project={project} geometries={floors} reviewAreas={reviewAreas} />
  );
}
