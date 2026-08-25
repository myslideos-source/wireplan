"use client";

import { useState } from "react";
import { Server } from "lucide-react";
import type { DistributionBoard } from "@/domain";
import { findSmartHomeModel } from "@/domain";
import { cn } from "@/lib/utils";

const PX_PER_TE = 34;
/** Auto-flow width per DIN row — a reasonable single-enclosure-side
 * width, not a real product's actual row count (that depends on the
 * physical Verteilerschrank chosen, which isn't modeled). */
const MAX_TE_PER_ROW = 12;
const FALLBACK_DIN_UNITS = 2;

/**
 * §26-29 (mockup) — the Schaltschrank rendered as a dark DIN-rail
 * cabinet instead of a plain list. Components auto-flow into rows sized
 * to MAX_TE_PER_ROW and are drawn proportional to their approximate
 * `dinUnits` width (see the domain comment on that field — these are
 * good-faith typical widths, not a certified spec).
 *
 * §29 wants clicking a Relay Extension to reveal per-channel consumer
 * assignments (Q1 Wohnzimmer Licht, ...) — this app doesn't model which
 * specific device wires to which physical output channel of which
 * extension (only room/circuit assignment exists), so building that
 * would mean inventing channel data. Instead, clicking a component
 * selects it and shows the real fields the catalog actually has.
 */
export function CabinetView({ distributionBoard }: { distributionBoard: DistributionBoard | null }) {
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const modelIds = distributionBoard?.cabinetComponentModelIds ?? [];

  if (!distributionBoard) {
    return (
      <div className="flex flex-1 items-center justify-center px-6 py-10 text-center">
        <p className="text-sm text-text-secondary">
          Noch kein Schaltschrank platziert. Legen Sie im Editor einen
          Technikraum fest und platzieren Sie dort einen Schaltschrank.
        </p>
      </div>
    );
  }

  if (modelIds.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center px-6 py-10 text-center">
        <p className="text-sm text-text-secondary">
          Noch keine Komponenten hinzugefügt. Wählen Sie im Editor den
          Schaltschrank aus und fügen Sie Komponenten hinzu.
        </p>
      </div>
    );
  }

  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentWidth = 0;
  for (const modelId of modelIds) {
    const width = findSmartHomeModel(modelId)?.dinUnits ?? FALLBACK_DIN_UNITS;
    if (currentWidth + width > MAX_TE_PER_ROW && currentRow.length > 0) {
      rows.push(currentRow);
      currentRow = [];
      currentWidth = 0;
    }
    currentRow.push(modelId);
    currentWidth += width;
  }
  if (currentRow.length > 0) rows.push(currentRow);

  const selectedModel = selectedModelId ? findSmartHomeModel(selectedModelId) : undefined;

  return (
    <div className="flex flex-1 gap-4 p-4">
      <div className="flex flex-1 flex-col gap-3 overflow-y-auto rounded-[var(--radius-lg)] bg-[#1c1f1e] p-4 scrollbar-thin-shell">
        {rows.map((row, rowIndex) => (
          <div key={rowIndex} className="flex flex-col gap-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[#6b756f]">
              Reihe {rowIndex + 1}
            </p>
            <div className="flex items-stretch gap-[2px] rounded-[4px] bg-[#141615] p-1">
              {row.map((modelId, i) => {
                const model = findSmartHomeModel(modelId);
                const width = (model?.dinUnits ?? FALLBACK_DIN_UNITS) * PX_PER_TE;
                const isSelected = selectedModelId === modelId;
                return (
                  <button
                    key={`${modelId}-${i}`}
                    type="button"
                    onClick={() => setSelectedModelId(modelId)}
                    style={{ width, minWidth: width }}
                    className={cn(
                      "flex h-16 flex-col items-center justify-center gap-1 rounded-[2px] border px-1 text-center transition-colors",
                      isSelected
                        ? "border-tech-tree bg-[#262b29]"
                        : "border-[#33372f] bg-[#22251f] hover:border-tech-tree/50",
                    )}
                  >
                    <Server className="h-3.5 w-3.5 shrink-0 text-tech-tree" />
                    <span className="line-clamp-2 text-[9px] font-medium leading-tight text-tech-tree">
                      {model?.label ?? modelId}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="w-64 shrink-0 rounded-[var(--radius-lg)] border border-border bg-panel p-4">
        {selectedModel ? (
          <div className="flex flex-col gap-2.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
              Komponente
            </p>
            <h3 className="text-sm font-semibold text-text">{selectedModel.label}</h3>
            <p className="text-xs text-text-secondary">{selectedModel.description}</p>
            <div className="mt-1 flex flex-col gap-1.5 border-t border-border pt-2.5 text-xs">
              <Row label="Anschluss" value={selectedModel.connectionType} />
              <Row label="Versorgung" value={selectedModel.powerSupply} />
              {selectedModel.dinUnits && <Row label="Breite" value={`${selectedModel.dinUnits} TE`} />}
            </div>
          </div>
        ) : (
          <p className="text-xs text-text-muted">
            Eine Komponente anklicken, um Details zu sehen.
          </p>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-text-muted">{label}</span>
      <span className="font-medium text-text">{value}</span>
    </div>
  );
}
