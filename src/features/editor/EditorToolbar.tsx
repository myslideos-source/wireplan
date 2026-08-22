"use client";

import {
  MousePointer2,
  Minus,
  Square,
  Plug,
  Lightbulb,
  ToggleLeft,
  Radar,
  Wifi,
  Server,
  Home,
  Cable,
  DoorOpen,
  AppWindow,
  Eye,
  EyeOff,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { isFeatureEnabled, type FeatureFlag } from "@/lib/feature-flags";
import { LOXONE_CATALOG, SMART_HOME_CATEGORY_LABELS } from "@/domain";
import { useEditorStore, type EditorTool, type LayerId } from "./store";

interface ToolDef {
  id: EditorTool;
  label: string;
  icon: LucideIcon;
  flag?: FeatureFlag;
  note?: string;
  requiresTechnikraum?: boolean;
}

const TOOLS: ToolDef[] = [
  { id: "select", label: "Auswählen", icon: MousePointer2 },
  { id: "wall", label: "Wand", icon: Minus, note: "Zeichenwerkzeug folgt" },
  { id: "room", label: "Raum", icon: Square, note: "Zeichenwerkzeug folgt" },
  { id: "door", label: "Tür einfügen", icon: DoorOpen },
  { id: "window", label: "Fenster einfügen", icon: AppWindow },
  { id: "outlet", label: "Steckdose", icon: Plug, flag: "ELECTRICAL_EDITOR" },
  { id: "light", label: "Lichtpunkt", icon: Lightbulb, flag: "ELECTRICAL_EDITOR" },
  { id: "switch", label: "Schalter", icon: ToggleLeft, flag: "ELECTRICAL_EDITOR" },
  { id: "sensor", label: "Sensor", icon: Radar, flag: "ELECTRICAL_EDITOR" },
  { id: "network", label: "Netzwerk", icon: Wifi, flag: "ELECTRICAL_EDITOR" },
  {
    id: "board",
    label: "Schaltschrank",
    icon: Server,
    flag: "ELECTRICAL_EDITOR",
    requiresTechnikraum: true,
    note: "Zuerst Technikraum festlegen",
  },
  { id: "smarthome", label: "Smart Home", icon: Home, flag: "LOXONE" },
  { id: "cable", label: "Kabel / Leitung", icon: Cable, flag: "CABLE_ROUTING" },
];

const LAYERS: { id: LayerId; label: string }[] = [
  { id: "grundriss", label: "Grundriss" },
  { id: "elektro", label: "Elektro" },
  { id: "kabelwege", label: "Kabelwege" },
  { id: "beschriftung", label: "Beschriftung" },
];

export function EditorToolbar() {
  const activeTool = useEditorStore((state) => state.activeTool);
  const setTool = useEditorStore((state) => state.setTool);
  const layers = useEditorStore((state) => state.layers);
  const toggleLayer = useEditorStore((state) => state.toggleLayer);
  const technikraumRoomId = useEditorStore((state) => state.technikraumRoomId);
  const smartHomePlacementModelId = useEditorStore((state) => state.smartHomePlacementModelId);
  const setSmartHomePlacementModelId = useEditorStore(
    (state) => state.setSmartHomePlacementModelId,
  );
  const loxoneEnabled = isFeatureEnabled("LOXONE");

  return (
    <aside className="flex w-56 shrink-0 flex-col gap-6 overflow-y-auto border-r border-border bg-bg-secondary p-3 scrollbar-thin">
      <div>
        <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
          Werkzeuge
        </p>
        <div className="flex flex-col gap-0.5">
          {TOOLS.map((tool) => {
            const flagEnabled = !tool.flag || isFeatureEnabled(tool.flag);
            const missingTechnikraum = tool.requiresTechnikraum && technikraumRoomId === null;
            const enabled = flagEnabled && !missingTechnikraum;
            const Icon = tool.icon;
            const disabled = !enabled;
            return (
              <div key={tool.id} className="flex flex-col gap-1">
                <button
                  type="button"
                  disabled={disabled}
                  title={
                    !flagEnabled
                      ? `${tool.note ?? "Folgt in einer späteren Phase"} — Demnächst`
                      : missingTechnikraum
                        ? tool.note
                        : undefined
                  }
                  onClick={() => setTool(tool.id)}
                  className={cn(
                    "flex items-center gap-3 rounded-[var(--radius-sm)] px-3 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40",
                    activeTool === tool.id && enabled
                      ? "bg-primary/10 text-primary"
                      : "text-text-secondary hover:bg-panel-elevated hover:text-text disabled:hover:bg-transparent",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {tool.label}
                </button>
                {tool.id === "smarthome" && loxoneEnabled && activeTool === "smarthome" && (
                  <select
                    value={smartHomePlacementModelId}
                    onChange={(event) => setSmartHomePlacementModelId(event.target.value)}
                    className="mx-1 rounded-[var(--radius-sm)] border border-border bg-bg px-2 py-1.5 text-xs text-text outline-none focus:border-primary/60"
                  >
                    {LOXONE_CATALOG.map((model) => (
                      <option key={model.id} value={model.id}>
                        {SMART_HOME_CATEGORY_LABELS[model.category]} · {model.label}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
          Ebenen
        </p>
        <div className="flex flex-col gap-0.5">
          {LAYERS.map((layer) => {
            const visible = layers[layer.id];
            return (
              <button
                key={layer.id}
                type="button"
                onClick={() => toggleLayer(layer.id)}
                className="flex items-center justify-between gap-3 rounded-[var(--radius-sm)] px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-panel-elevated hover:text-text"
              >
                {layer.label}
                {visible ? (
                  <Eye className="h-4 w-4 text-text-muted" />
                ) : (
                  <EyeOff className="h-4 w-4 text-text-muted/50" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
