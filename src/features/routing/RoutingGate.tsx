"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import type { Project } from "@/domain";
import { useEditorStore } from "@/features/editor/store";
import { RoutingWorkspace } from "./RoutingWorkspace";
import { RoutingNotReady } from "./RoutingNotReady";

/** §106 — same wait-for-Supabase pattern as `EditorGate`: floors saved in
 * a previous session live in Supabase, not this page load's in-memory
 * store, so a fresh reload must check there before deciding the project
 * has no floor yet. */
export function RoutingGate({ project }: { project: Project }) {
  const floorId = useEditorStore((state) => state.floorId);
  const firstFloorProjectId = useEditorStore((state) => state.floors[0]?.floor.projectId);
  const hydrateFromSupabase = useEditorStore((state) => state.hydrateFromSupabase);
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
    return <RoutingNotReady project={project} />;
  }

  return <RoutingWorkspace project={project} />;
}
