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

export function EditorWorkspace({
  project,
  geometry,
  reviewAreas,
}: {
  project: Project;
  geometry: FloorGeometry;
  reviewAreas?: FlaggedArea[];
}) {
  const hydrate = useEditorStore((state) => state.hydrate);
  const startReview = useEditorStore((state) => state.startReview);
  const reviewStarted = useRef(false);

  useEffect(() => {
    hydrate(geometry);
  }, [hydrate, geometry]);

  useEffect(() => {
    if (reviewStarted.current || !reviewAreas?.length) return;
    reviewStarted.current = true;
    startReview(reviewAreas);
  }, [reviewAreas, startReview]);

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
        <span className="text-text-muted">· {geometry.floor.name}</span>
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
