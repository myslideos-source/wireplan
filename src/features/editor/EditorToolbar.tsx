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
  Home,
  Cable,
  Eye,
  EyeOff,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { isFeatureEnabled, type FeatureFlag } from "@/lib/feature-flags";
import { useEditorStore, type EditorTool, type LayerId } from "./store";

interface ToolDef {
  id: EditorTool;
  label: string;
  icon: LucideIcon;
  flag?: FeatureFlag;
  note?: string;
}

const TOOLS: ToolDef[] = [
  { id: "select", label: "Auswählen", icon: MousePointer2 },
  { id: "wall", label: "Wand", icon: Minus, note: "Zeichenwerkzeug folgt" },
  { id: "room", label: "Raum", icon: Square, note: "Zeichenwerkzeug folgt" },
  { id: "outlet", label: "Steckdose", icon: Plug, flag: "ELECTRICAL_EDITOR" },
  { id: "light", label: "Lichtpunkt", icon: Lightbulb, flag: "ELECTRICAL_EDITOR" },
  { id: "switch", label: "Schalter", icon: ToggleLeft, flag: "ELECTRICAL_EDITOR" },
  { id: "sensor", label: "Sensor", icon: Radar, flag: "ELECTRICAL_EDITOR" },
  { id: "network", label: "Netzwerk", icon: Wifi, flag: "ELECTRICAL_EDITOR" },
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

  return (
    <aside className="flex w-56 shrink-0 flex-col gap-6 overflow-y-auto border-r border-border bg-bg-secondary p-3 scrollbar-thin">
      <div>
        <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
          Werkzeuge
        </p>
        <div className="flex flex-col gap-0.5">
          {TOOLS.map((tool) => {
            const enabled = !tool.flag || isFeatureEnabled(tool.flag);
            const Icon = tool.icon;
            const disabled = !enabled;
            return (
              <button
                key={tool.id}
                type="button"
                disabled={disabled}
                title={
                  disabled
                    ? `${tool.note ?? "Folgt in einer späteren Phase"} — Demnächst`
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
