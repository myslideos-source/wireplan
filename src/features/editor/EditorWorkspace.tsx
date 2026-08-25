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
import { SmartHomeDevicePicker } from "./SmartHomeDevicePicker";
import { EditorInspector } from "./EditorInspector";
import { EditorStatusBar } from "./EditorStatusBar";
import { FloorTabs } from "./FloorTabs";
import { LayerToggleBar } from "./LayerToggleBar";
import { ReviewPanel } from "./ReviewPanel";
import { type StartFloorInput } from "./StartFloorDialog";
import { cn } from "@/lib/utils";

export function EditorWorkspace({
  project,
  geometries,
  reviewAreas,
  backgroundImages,
}: {
  project: Project;
  geometries: FloorGeometry[];
  reviewAreas?: FlaggedArea[];
  /** Per-floor locked background image to seed on first hydration — used
   * when a multi-page plan import (Phase 12) produces several floors that
   * each already have their own page image before the user has ever
   * visited most of them. Omit for the normal server-fetched-geometries
   * path, which never has a background to seed up front. */
  backgroundImages?: Record<string, { dataUrl: string; naturalWidth: number; naturalHeight: number }>;
}) {
  const hydrate = useEditorStore((state) => state.hydrate);
  const hydrateWithBackgrounds = useEditorStore((state) => state.hydrateWithBackgrounds);
  const switchFloor = useEditorStore((state) => state.switchFloor);
  const addFloor = useEditorStore((state) => state.addFloor);
  const floorId = useEditorStore((state) => state.floorId);
  const storeFloors = useEditorStore((state) => state.floors);
  const startReview = useEditorStore((state) => state.startReview);
  const planViewMode = useEditorStore((state) => state.planViewMode);
  const setPlanViewMode = useEditorStore((state) => state.setPlanViewMode);
  const reviewStarted = useRef(false);

  useEffect(() => {
    if (backgroundImages) hydrateWithBackgrounds(geometries, backgroundImages);
    else hydrate(geometries);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrate, hydrateWithBackgrounds, geometries[0]?.floor.projectId]);

  useEffect(() => {
    if (reviewStarted.current || !reviewAreas?.length) return;
    reviewStarted.current = true;
    startReview(reviewAreas);
  }, [reviewAreas, startReview]);

  // Read from the store's own `floors` rather than the `geometries` prop —
  // the prop is a static server snapshot, while the store also reflects a
  // floor added via "+ Etage" during this session (§ addFloor).
  const sortedFloors = [...storeFloors].sort((a, b) => a.floor.level - b.floor.level);
  const activeFloor = sortedFloors.find((f) => f.floor.id === floorId) ?? sortedFloors[0];

  function handleCreateFloor(inputs: StartFloorInput[]) {
    for (const input of inputs) addFloor(input);
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-11 shrink-0 items-center gap-3 border-b border-border bg-panel px-4 text-sm">
        <Link
          href="/dashboard"
          className="flex items-center gap-1.5 text-text-secondary hover:text-text"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <span className="font-medium text-text">{project.name}</span>

        <div className="ml-auto flex items-center gap-0.5 rounded-[var(--radius-sm)] border border-border bg-panel-elevated p-0.5">
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
      <FloorTabs
        floors={sortedFloors}
        activeFloorId={activeFloor?.floor.id}
        onSwitch={switchFloor}
        onCreate={handleCreateFloor}
      />
      <div className="flex min-h-0 flex-1">
        <EditorToolbar />
        <div className="relative flex min-w-0 flex-1 flex-col">
          <SmartHomeDevicePicker />
          <div className="relative min-h-0 flex-1 bg-canvas-bg">
            <EditorCanvas />
            <LayerToggleBar />
            <ReviewPanel />
          </div>
        </div>
        <EditorInspector />
      </div>
      <EditorStatusBar />
    </div>
  );
}
