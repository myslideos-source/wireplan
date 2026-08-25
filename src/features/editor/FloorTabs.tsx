"use client";

import { ChevronDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Dropdown, DropdownItem, DropdownLabel } from "@/components/ui";
import type { FloorGeometry } from "./mock-geometry";
import { StartFloorDialog, type StartFloorInput } from "./StartFloorDialog";

/**
 * §4 (mockup) — a compact floor-switcher row directly above the plan
 * canvas: a dropdown for the active floor plus quick-click tabs for every
 * floor, separate from the global TopNavigation above it. Floor names are
 * whatever the user typed when creating the floor (there's no dedicated
 * short-code field in the data model), so tabs show the real name rather
 * than a fabricated "EG"/"OG" abbreviation that could be wrong.
 */
export function FloorTabs({
  floors,
  activeFloorId,
  onSwitch,
  onCreate,
}: {
  floors: FloorGeometry[];
  activeFloorId: string | undefined;
  onSwitch: (floorId: string) => void;
  onCreate: (inputs: StartFloorInput[]) => void;
}) {
  const activeFloor = floors.find((f) => f.floor.id === activeFloorId) ?? floors[0];

  return (
    <div className="flex items-center gap-2 border-b border-border bg-panel px-4 py-2">
      <Dropdown
        align="start"
        trigger={
          <span className="flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-border bg-panel px-3 py-1.5 text-sm font-medium text-text">
            {activeFloor?.floor.name ?? "Etage wählen"}
            <ChevronDown className="h-3.5 w-3.5 text-text-muted" />
          </span>
        }
      >
        <DropdownLabel>Etagen</DropdownLabel>
        {floors.map((f) => (
          <DropdownItem key={f.floor.id} onClick={() => onSwitch(f.floor.id)}>
            {f.floor.name}
          </DropdownItem>
        ))}
      </Dropdown>

      <div className="flex items-center gap-1">
        {floors.map((f) => {
          const isActive = f.floor.id === activeFloor?.floor.id;
          return (
            <button
              key={f.floor.id}
              type="button"
              onClick={() => onSwitch(f.floor.id)}
              className={cn(
                "rounded-[var(--radius-sm)] border px-2.5 py-1 text-xs font-semibold transition-colors",
                isActive
                  ? "border-primary/40 bg-primary-soft text-primary"
                  : "border-border bg-panel text-text-secondary hover:text-text",
              )}
            >
              {f.floor.name}
            </button>
          );
        })}
      </div>

      <StartFloorDialog
        suggestedName={`Etage ${floors.length + 1}`}
        suggestedLevel={(floors[floors.length - 1]?.floor.level ?? -1) + 1}
        triggerLabel="Etage anlegen"
        onCreate={onCreate}
        trigger={(onOpen) => (
          <button
            type="button"
            onClick={onOpen}
            aria-label="Etage hinzufügen"
            title="Etage hinzufügen"
            className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)] text-text-secondary transition-colors hover:bg-panel-elevated hover:text-text"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        )}
      />
    </div>
  );
}
