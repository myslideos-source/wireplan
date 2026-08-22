"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { Project } from "@/domain";
import type { FloorGeometry } from "./mock-geometry";
import { useEditorStore } from "./store";
import { EditorToolbar } from "./EditorToolbar";
import { EditorCanvas } from "./EditorCanvas";
import { EditorInspector } from "./EditorInspector";
import { EditorStatusBar } from "./EditorStatusBar";

export function EditorWorkspace({
  project,
  geometry,
}: {
  project: Project;
  geometry: FloorGeometry;
}) {
  const hydrate = useEditorStore((state) => state.hydrate);

  useEffect(() => {
    hydrate(geometry);
  }, [hydrate, geometry]);

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
        <EditorCanvas />
        <EditorInspector />
      </div>
      <EditorStatusBar />
    </div>
  );
}
