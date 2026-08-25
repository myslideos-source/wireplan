"use client";

import * as React from "react";
import { ChevronsLeftRight } from "lucide-react";
import { OriginalPlanSvg, DigitalPlanSvg } from "./PlanIllustrations";

export function CompareSlider() {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [percent, setPercent] = React.useState(50);
  const dragging = React.useRef(false);

  const updateFromClientX = React.useCallback((clientX: number) => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const next = ((clientX - rect.left) / rect.width) * 100;
    setPercent(Math.min(100, Math.max(0, next)));
  }, []);

  React.useEffect(() => {
    function onMove(event: PointerEvent) {
      if (!dragging.current) return;
      updateFromClientX(event.clientX);
    }
    function onUp() {
      dragging.current = false;
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [updateFromClientX]);

  return (
    <div
      ref={containerRef}
      className="relative aspect-[10/7] w-full select-none overflow-hidden rounded-[var(--radius-lg)] border border-border"
    >
      <div className="absolute inset-0">
        <OriginalPlanSvg />
      </div>
      <div
        className="absolute inset-0"
        style={{ clipPath: `inset(0 0 0 ${percent}%)` }}
      >
        <DigitalPlanSvg />
      </div>

      <span className="absolute left-3 top-3 rounded-full border border-border-subtle bg-black/50 px-2.5 py-1 text-xs font-medium text-text backdrop-blur-sm">
        Originaler Plan
      </span>
      <span className="absolute right-3 top-3 rounded-full border border-primary/30 bg-black/50 px-2.5 py-1 text-xs font-medium text-primary backdrop-blur-sm">
        Digitalisierter Grundriss
      </span>

      <div
        className="absolute inset-y-0 w-px bg-primary shadow-[0_0_12px_rgba(27,122,74,0.6)]"
        style={{ left: `${percent}%` }}
      />
      <button
        type="button"
        aria-label="Original- und Digitalansicht vergleichen"
        onPointerDown={(event) => {
          dragging.current = true;
          updateFromClientX(event.clientX);
        }}
        className="absolute top-1/2 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize items-center justify-center rounded-full border border-primary bg-panel-elevated text-primary shadow-lg"
        style={{ left: `${percent}%` }}
      >
        <ChevronsLeftRight className="h-4 w-4" />
      </button>
    </div>
  );
}
