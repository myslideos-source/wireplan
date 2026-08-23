"use client";

import { useEffect } from "react";
import { CheckCircle2, CloudCheck, ZoomIn, ZoomOut, RotateCcw, Undo2, Redo2 } from "lucide-react";
import { useEditorStore } from "./store";

export function EditorStatusBar() {
  const zoom = useEditorStore((state) => state.zoom);
  const setZoom = useEditorStore((state) => state.setZoom);
  const layers = useEditorStore((state) => state.layers);
  const history = useEditorStore((state) => state.history);
  const future = useEditorStore((state) => state.future);
  const undo = useEditorStore((state) => state.undo);
  const redo = useEditorStore((state) => state.redo);

  const visibleLayers = Object.entries(layers)
    .filter(([, visible]) => visible)
    .length;

  // §47 — Ctrl/Cmd+Z and Ctrl/Cmd+Shift+Z work anywhere in the editor, not
  // just while these buttons have focus.
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== "z") return;
      event.preventDefault();
      if (event.shiftKey) useEditorStore.getState().redo();
      else useEditorStore.getState().undo();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <footer className="flex h-9 shrink-0 items-center justify-between border-t border-border bg-bg-secondary px-4 text-xs text-text-secondary">
      <div className="flex items-center gap-3">
        <CheckCircle2 className="h-3.5 w-3.5 text-success" />
        Keine Fehler
        <div className="flex items-center gap-1 border-l border-border pl-3">
          <button
            type="button"
            aria-label="Rückgängig"
            title="Rückgängig (Strg+Z)"
            disabled={history.length === 0}
            onClick={undo}
            className="rounded-[var(--radius-sm)] p-1 hover:bg-panel-elevated hover:text-text disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <Undo2 className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            aria-label="Wiederholen"
            title="Wiederholen (Strg+Umschalt+Z)"
            disabled={future.length === 0}
            onClick={redo}
            className="rounded-[var(--radius-sm)] p-1 hover:bg-panel-elevated hover:text-text disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <Redo2 className="h-3.5 w-3.5" />
          </button>
        </div>
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
