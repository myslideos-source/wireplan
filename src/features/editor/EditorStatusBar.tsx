"use client";

import { CheckCircle2, CloudCheck, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { useEditorStore } from "./store";

export function EditorStatusBar() {
  const zoom = useEditorStore((state) => state.zoom);
  const setZoom = useEditorStore((state) => state.setZoom);
  const layers = useEditorStore((state) => state.layers);

  const visibleLayers = Object.entries(layers)
    .filter(([, visible]) => visible)
    .length;

  return (
    <footer className="flex h-9 shrink-0 items-center justify-between border-t border-border bg-bg-secondary px-4 text-xs text-text-secondary">
      <div className="flex items-center gap-1.5">
        <CheckCircle2 className="h-3.5 w-3.5 text-success" />
        Keine Fehler
      </div>

      <div className="flex items-center gap-4">
        <span className="text-text-muted">
          {visibleLayers} / {Object.keys(layers).length} Ebenen sichtbar
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Verkleinern"
            onClick={() => setZoom((z) => z - 0.2)}
            className="rounded-[var(--radius-sm)] p-1 hover:bg-panel-elevated hover:text-text"
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </button>
          <span className="tabular-nums-font w-10 text-center text-text">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            aria-label="Vergrößern"
            onClick={() => setZoom((z) => z + 0.2)}
            className="rounded-[var(--radius-sm)] p-1 hover:bg-panel-elevated hover:text-text"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            aria-label="Zoom zurücksetzen"
            onClick={() => setZoom(1)}
            className="rounded-[var(--radius-sm)] p-1 hover:bg-panel-elevated hover:text-text"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <CloudCheck className="h-3.5 w-3.5 text-success" />
        Änderungen gespeichert
      </div>
    </footer>
  );
}
