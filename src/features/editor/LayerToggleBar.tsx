"use client";

import { Eye, EyeOff } from "lucide-react";
import { useEditorStore, type LayerId } from "./store";

const LAYERS: { id: LayerId; label: string }[] = [
  { id: "grundriss", label: "Grundriss" },
  { id: "elektro", label: "Elektro" },
  { id: "kabelwege", label: "Kabelwege" },
  { id: "beschriftung", label: "Beschriftung" },
  { id: "hintergrund", label: "Hintergrundbild" },
];

/**
 * §9 (mockup) — a small layer-visibility control floating over the plan
 * canvas itself, rather than buried in the tool sidebar. Same store state
 * as before (`layers`/`toggleLayer`) — only where it's rendered changed.
 */
export function LayerToggleBar() {
  const layers = useEditorStore((state) => state.layers);
  const toggleLayer = useEditorStore((state) => state.toggleLayer);

  return (
    <div className="absolute right-3 top-3 z-10 flex flex-col gap-0.5 rounded-[var(--radius-sm)] border border-border bg-panel/95 p-2 text-xs shadow-[var(--shadow-sm)] backdrop-blur-sm">
      <p className="px-1.5 pb-1 text-[10px] font-semibold uppercase tracking-wide text-text-muted">
        Ebenen
      </p>
      {LAYERS.map((layer) => {
        const visible = layers[layer.id];
        return (
          <button
            key={layer.id}
            type="button"
            onClick={() => toggleLayer(layer.id)}
            className="flex items-center justify-between gap-4 rounded-[var(--radius-sm)] px-1.5 py-1 font-medium text-text-secondary transition-colors hover:bg-panel-elevated hover:text-text"
          >
            {layer.label}
            {visible ? (
              <Eye className="h-3.5 w-3.5" />
            ) : (
              <EyeOff className="h-3.5 w-3.5 text-text-muted/50" />
            )}
          </button>
        );
      })}
    </div>
  );
}
