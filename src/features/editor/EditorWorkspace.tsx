"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { Project } from "@/domain";
import type { FlaggedArea } from "@/features/plan-analysis/types";
import type { FloorGeometry } from "./mock-geometry";
import { useEditorStore } from "./store";
import { EditorToolbar } from "./EditorToolbar";
import { EditorCanvas } from "./EditorCanvas";
import { EditorInspector } from "./EditorInspector";
import { EditorStatusBar } from "./EditorStatusBar";
import { ReviewPanel } from "./ReviewPanel";
import { cn } from "@/lib/utils";

export function EditorWorkspace({
  project,
  geometries,
  reviewAreas,
}: {
  project: Project;
  geometries: FloorGeometry[];
  reviewAreas?: FlaggedArea[];
}) {
  const hydrate = useEditorStore((state) => state.hydrate);
  const switchFloor = useEditorStore((state) => state.switchFloor);
  const floorId = useEditorStore((state) => state.floorId);
  const startReview = useEditorStore((state) => state.startReview);
  const planViewMode = useEditorStore((state) => state.planViewMode);
  const setPlanViewMode = useEditorStore((state) => state.setPlanViewMode);
  const reviewStarted = useRef(false);

  useEffect(() => {
    hydrate(geometries);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrate, geometries[0]?.floor.projectId]);

  useEffect(() => {
    if (reviewStarted.current || !reviewAreas?.length) return;
    reviewStarted.current = true;
    startReview(reviewAreas);
  }, [reviewAreas, startReview]);

  const sortedFloors = [...geometries].sort((a, b) => a.floor.level - b.floor.level);
  const activeFloor = sortedFloors.find((f) => f.floor.id === floorId) ?? sortedFloors[0];

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-11 shrink-0 items-center gap-3 border-b border-border bg-bg-secondary px-4 text-sm">
        <Link
          href="/dashboard"
          className="flex items-center gap-1.5 text-text-secondary hover:text-text"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <span className="font-medium text-text">{project.name}</span>
        {sortedFloors.length > 1 ? (
          <div className="flex items-center gap-0.5 rounded-[var(--radius-sm)] border border-border bg-bg p-0.5">
            {sortedFloors.map((f) => (
              <button
                key={f.floor.id}
                type="button"
                onClick={() => switchFloor(f.floor.id)}
                className={cn(
                  "rounded-[calc(var(--radius-sm)-2px)] px-2.5 py-1 text-xs font-medium transition-colors",
                  f.floor.id === activeFloor?.floor.id
                    ? "bg-primary/15 text-primary"
                    : "text-text-secondary hover:text-text",
                )}
              >
                {f.floor.name}
              </button>
            ))}
          </div>
        ) : (
          <span className="text-text-muted">· {activeFloor?.floor.name}</span>
        )}

        <div className="ml-auto flex items-center gap-0.5 rounded-[var(--radius-sm)] border border-border bg-bg p-0.5">
          {(["original", "planer"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setPlanViewMode(mode)}
              className={cn(
                "rounded-[calc(var(--radius-sm)-2px)] px-3 py-1 text-xs font-semibold uppercase tracking-wide transition-colors",
                planViewMode === mode
                  ? "bg-primary/15 text-primary"
                  : "text-text-secondary hover:text-text",
              )}
            >
              {mode === "original" ? "Original" : "Planer"}
            </button>
          ))}
        </div>
      </div>
      <div className="flex min-h-0 flex-1">
        <EditorToolbar />
        <div className="relative min-w-0 flex-1">
          <EditorCanvas />
          <ReviewPanel />
        </div>
        <EditorInspector />
      </div>
      <EditorStatusBar />
    </div>
  );
}
