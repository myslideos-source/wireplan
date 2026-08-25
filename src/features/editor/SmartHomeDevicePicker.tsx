"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import {
  LOXONE_CATALOG,
  PLANNING_CATEGORY_LABELS,
  PLANNING_CATEGORY_ORDER,
  type PlanningCategory,
} from "@/domain";
import { cn } from "@/lib/utils";
import { useEditorStore } from "./store";
import { SMART_HOME_ICONS } from "./smart-home-icons";

/**
 * The Loxone device palette (§Phase17) — replaces the old cramped
 * grouped `<select>` in the toolbar sidebar with a proper above-the-plan
 * picker: search, category chips, and clickable icon tiles, so the ~110+
 * catalog entries stay browsable instead of one long flat dropdown.
 * Shown only while the "Smart Home" tool is armed (same visibility rule
 * the old inline select used) — picking a tile just sets the placement
 * model, it doesn't disarm the tool, so the user can click straight onto
 * the plan afterward.
 */
export function SmartHomeDevicePicker() {
  const activeTool = useEditorStore((state) => state.activeTool);
  const smartHomePlacementModelId = useEditorStore((state) => state.smartHomePlacementModelId);
  const setSmartHomePlacementModelId = useEditorStore(
    (state) => state.setSmartHomePlacementModelId,
  );
  const showLegacySmartHomeDevices = useEditorStore((state) => state.showLegacySmartHomeDevices);
  const toggleShowLegacySmartHomeDevices = useEditorStore(
    (state) => state.toggleShowLegacySmartHomeDevices,
  );
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<PlanningCategory | "alle">("alle");

  const floorplanModels = useMemo(
    () =>
      LOXONE_CATALOG.filter(
        (model) => model.isPlanableOnFloorplan && (showLegacySmartHomeDevices || !model.legacy),
      ),
    [showLegacySmartHomeDevices],
  );

  const availableCategories = useMemo(
    () =>
      PLANNING_CATEGORY_ORDER.filter((category) =>
        floorplanModels.some((model) => model.planningCategory === category),
      ),
    [floorplanModels],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return floorplanModels.filter((model) => {
      if (activeCategory !== "alle" && model.planningCategory !== activeCategory) return false;
      if (!q) return true;
      return model.label.toLowerCase().includes(q) || model.description.toLowerCase().includes(q);
    });
  }, [floorplanModels, activeCategory, query]);

  if (activeTool !== "smarthome") return null;

  const groups =
    activeCategory === "alle"
      ? availableCategories
          .map((category) => ({
            category,
            models: filtered.filter((model) => model.planningCategory === category),
          }))
          .filter((group) => group.models.length > 0)
      : [{ category: activeCategory, models: filtered }];

  return (
    <div
      data-testid="smart-home-picker"
      className="flex flex-col gap-3 border-b border-border bg-panel px-4 py-3 shadow-sm"
    >
      <div className="flex items-center gap-3">
        <div className="relative max-w-xs flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Loxone-Gerät suchen…"
            className="w-full rounded-[var(--radius-sm)] border border-border bg-bg py-1.5 pl-8 pr-3 text-sm text-text outline-none focus:border-primary/60"
          />
        </div>
        <label className="flex shrink-0 items-center gap-1.5 text-xs text-text-muted">
          <input
            type="checkbox"
            checked={showLegacySmartHomeDevices}
            onChange={toggleShowLegacySmartHomeDevices}
            className="h-3.5 w-3.5 rounded border-border"
          />
          Legacy-Geräte anzeigen
        </label>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => setActiveCategory("alle")}
          className={cn(
            "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
            activeCategory === "alle"
              ? "border-primary bg-primary/10 text-primary"
              : "border-border text-text-secondary hover:border-primary/50 hover:text-text",
          )}
        >
          Alle
        </button>
        {availableCategories.map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => setActiveCategory(category)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              activeCategory === category
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-text-secondary hover:border-primary/50 hover:text-text",
            )}
          >
            {PLANNING_CATEGORY_LABELS[category]}
          </button>
        ))}
      </div>

      <div className="flex max-h-52 flex-col gap-3 overflow-y-auto pr-1 scrollbar-thin">
        {groups.length === 0 && (
          <p className="py-4 text-center text-sm text-text-muted">
            Keine Geräte für „{query}“ gefunden.
          </p>
        )}
        {groups.map(({ category, models }) => (
          <div key={category} className="flex flex-col gap-1.5">
            {activeCategory === "alle" && (
              <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                {PLANNING_CATEGORY_LABELS[category]}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              {models.map((model) => {
                const Icon = SMART_HOME_ICONS[model.icon];
                const selected = model.id === smartHomePlacementModelId;
                return (
                  <button
                    key={model.id}
                    type="button"
                    title={model.description}
                    onClick={() => setSmartHomePlacementModelId(model.id)}
                    className={cn(
                      "flex w-[84px] flex-col items-center gap-1 rounded-[var(--radius-sm)] border px-2 py-2 text-center transition-colors",
                      selected
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50 hover:bg-panel-elevated",
                    )}
                  >
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                      style={{ backgroundColor: `${model.color}26`, color: model.color }}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="line-clamp-2 text-[11px] font-medium leading-tight text-text">
                      {model.label}
                    </span>
                    {model.legacy && (
                      <span className="text-[9px] font-semibold uppercase tracking-wide text-warning">
                        Legacy
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
