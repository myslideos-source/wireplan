"use client";

import { MousePointer2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEditorStore } from "./store";

/**
 * §113 — a floating quick-access button over the plan itself, mirroring
 * where `LayerToggleBar` sits on the opposite corner, so switching back
 * to "Auswählen" after placing something doesn't require opening the
 * full component sidebar first — the sidebar is a full-screen overlay on
 * mobile/tablet, so reaching it mid-workflow was the extra step this
 * fixes.
 */
export function QuickSelectBar() {
  const activeTool = useEditorStore((state) => state.activeTool);
  const setTool = useEditorStore((state) => state.setTool);

  return (
    <div className="absolute left-3 top-3 z-10 flex items-center gap-0.5 rounded-[var(--radius-sm)] border border-border bg-panel/95 p-1 shadow-[var(--shadow-sm)] backdrop-blur-sm">
      <button
        type="button"
        onClick={() => setTool("select")}
        className={cn(
          "flex items-center gap-1.5 rounded-[var(--radius-sm)] px-2.5 py-1.5 text-xs font-medium transition-colors",
          activeTool === "select"
            ? "bg-primary-soft text-primary"
            : "text-text-secondary hover:bg-panel-elevated hover:text-text",
        )}
      >
        <MousePointer2 className="h-3.5 w-3.5" />
        Auswählen
      </button>
    </div>
  );
}
