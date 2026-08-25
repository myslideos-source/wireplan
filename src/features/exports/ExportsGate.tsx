"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import type { Project } from "@/domain";
import { useEditorStore } from "@/features/editor/store";
import { ExportsWorkspace } from "./ExportsWorkspace";
import { ExportsNotReady } from "./ExportsNotReady";

/** §106 — same wait-for-Supabase pattern as `EditorGate`/`RoutingGate`. */
export function ExportsGate({ project }: { project: Project }) {
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
    return <ExportsNotReady project={project} />;
  }

  return <ExportsWorkspace project={project} />;
}
