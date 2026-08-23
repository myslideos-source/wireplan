"use client";

import { useRef } from "react";
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
  Image as ImageIcon,
  Eye,
  EyeOff,
  GitBranch,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { isFeatureEnabled, type FeatureFlag } from "@/lib/feature-flags";
import { LOXONE_CATALOG, SMART_HOME_CATEGORY_LABELS, FIXED_CONSUMER_LABELS, type FixedConsumerType } from "@/domain";
import { useEditorStore, type EditorTool, type LayerId } from "./store";
import { DRAG_TOOL_MIME } from "./drag-tool";

/** Tools that can be dragged straight onto the plan (§3) in addition to
 * the existing click-to-arm-then-click-to-place flow — both keep working. */
const DRAGGABLE_TOOLS: EditorTool[] = [
  "outlet",
  "light",
  "switch",
  "sensor",
  "network",
  "smarthome",
  "consumer",
];

const SPOT_COUNTS = [2, 3, 4, 5, 6, 8, 10, 12];
const SPOT_ARRANGEMENTS: { id: "line" | "grid" | "rectangle" | "circle" | "manual"; label: string }[] = [
  { id: "grid", label: "Raster" },
  { id: "line", label: "Gerade Linie" },
  { id: "rectangle", label: "Rechteck" },
  { id: "circle", label: "Kreis" },
  { id: "manual", label: "Manuell" },
];

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
  { id: "consumer", label: "Fester Verbraucher", icon: Zap, flag: "ELECTRICAL_EDITOR" },
  { id: "background", label: "Hintergrundbild", icon: ImageIcon },
  { id: "cable", label: "Kabel / Leitung", icon: Cable, flag: "CABLE_ROUTING" },
];

const LAYERS: { id: LayerId; label: string }[] = [
  { id: "grundriss", label: "Grundriss" },
  { id: "elektro", label: "Elektro" },
  { id: "kabelwege", label: "Kabelwege" },
  { id: "beschriftung", label: "Beschriftung" },
  { id: "hintergrund", label: "Hintergrundbild" },
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
  const backgroundImage = useEditorStore((state) => state.backgroundImage);
  const setBackgroundImage = useEditorStore((state) => state.setBackgroundImage);
  const clearBackgroundImage = useEditorStore((state) => state.clearBackgroundImage);
  const treeViewActive = useEditorStore((state) => state.treeViewActive);
  const toggleTreeView = useEditorStore((state) => state.toggleTreeView);
  const spotArrayCount = useEditorStore((state) => state.spotArrayCount);
  const setSpotArrayCount = useEditorStore((state) => state.setSpotArrayCount);
  const spotArrayArrangement = useEditorStore((state) => state.spotArrayArrangement);
  const setSpotArrayArrangement = useEditorStore((state) => state.setSpotArrayArrangement);
  const fixedConsumerPlacementType = useEditorStore((state) => state.fixedConsumerPlacementType);
  const setFixedConsumerPlacementType = useEditorStore((state) => state.setFixedConsumerPlacementType);
  const fixedConsumerCustomLabel = useEditorStore((state) => state.fixedConsumerCustomLabel);
  const setFixedConsumerCustomLabel = useEditorStore((state) => state.setFixedConsumerCustomLabel);
  const loxoneEnabled = isFeatureEnabled("LOXONE");
  const backgroundInputRef = useRef<HTMLInputElement>(null);

  function handleBackgroundFile(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const img = new window.Image();
      img.onload = () => {
        setBackgroundImage(dataUrl, img.naturalWidth, img.naturalHeight);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  }

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
                  draggable={enabled && DRAGGABLE_TOOLS.includes(tool.id)}
                  onDragStart={(event) => {
                    if (!enabled || !DRAGGABLE_TOOLS.includes(tool.id)) return;
                    event.dataTransfer.setData(DRAG_TOOL_MIME, tool.id);
                    event.dataTransfer.effectAllowed = "copy";
                  }}
                  title={
                    !flagEnabled
                      ? `${tool.note ?? "Folgt in einer späteren Phase"} — Demnächst`
                      : missingTechnikraum
                        ? tool.note
                        : enabled && DRAGGABLE_TOOLS.includes(tool.id)
                          ? "Klicken zum Aktivieren oder direkt in den Plan ziehen"
                          : undefined
                  }
                  onClick={() => setTool(tool.id)}
                  className={cn(
                    "flex items-center gap-3 rounded-[var(--radius-sm)] px-3 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40",
                    enabled && DRAGGABLE_TOOLS.includes(tool.id) && "cursor-grab active:cursor-grabbing",
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
                {tool.id === "consumer" && activeTool === "consumer" && (
                  <div className="mx-1 flex flex-col gap-1.5">
                    <select
                      value={fixedConsumerPlacementType}
                      onChange={(event) =>
                        setFixedConsumerPlacementType(event.target.value as FixedConsumerType)
                      }
                      className="rounded-[var(--radius-sm)] border border-border bg-bg px-2 py-1.5 text-xs text-text outline-none focus:border-primary/60"
                    >
                      {(Object.entries(FIXED_CONSUMER_LABELS) as [FixedConsumerType, string][]).map(
                        ([type, label]) => (
                          <option key={type} value={type}>
                            {label}
                          </option>
                        ),
                      )}
                    </select>
                    {fixedConsumerPlacementType === "custom" && (
                      <input
                        value={fixedConsumerCustomLabel}
                        onChange={(event) => setFixedConsumerCustomLabel(event.target.value)}
                        placeholder="Bezeichnung"
                        className="rounded-[var(--radius-sm)] border border-border bg-bg px-2 py-1.5 text-xs text-text outline-none focus:border-primary/60"
                      />
                    )}
                  </div>
                )}
                {tool.id === "light" && activeTool === "light" && (
                  <div className="mx-1 flex flex-col gap-1.5">
                    <p className="px-1 text-[11px] text-text-muted">Mehrere Spots platzieren</p>
                    <select
                      value={spotArrayCount}
                      onChange={(event) => setSpotArrayCount(Number(event.target.value))}
                      className="rounded-[var(--radius-sm)] border border-border bg-bg px-2 py-1.5 text-xs text-text outline-none focus:border-primary/60"
                    >
                      <option value={1}>Einzeln</option>
                      {SPOT_COUNTS.map((count) => (
                        <option key={count} value={count}>
                          {count} Spots
                        </option>
                      ))}
                    </select>
                    {spotArrayCount > 1 && (
                      <select
                        value={spotArrayArrangement}
                        onChange={(event) =>
                          setSpotArrayArrangement(event.target.value as (typeof SPOT_ARRANGEMENTS)[number]["id"])
                        }
                        className="rounded-[var(--radius-sm)] border border-border bg-bg px-2 py-1.5 text-xs text-text outline-none focus:border-primary/60"
                      >
                        {SPOT_ARRANGEMENTS.map((arrangement) => (
                          <option key={arrangement.id} value={arrangement.id}>
                            {arrangement.label}
                          </option>
                        ))}
                      </select>
                    )}
                    {spotArrayCount > 1 && (
                      <p className="px-1 text-[11px] text-text-muted">
                        Klicken Sie in einen Raum — die Spots werden dort verteilt und lassen sich
                        danach einzeln verschieben.
                      </p>
                    )}
                  </div>
                )}
                {tool.id === "background" && activeTool === "background" && (
                  <div className="mx-1 flex flex-col gap-1.5">
                    <input
                      ref={backgroundInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(event) => handleBackgroundFile(event.target.files)}
                    />
                    <button
                      type="button"
                      onClick={() => backgroundInputRef.current?.click()}
                      className="rounded-[var(--radius-sm)] border border-border px-2 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:border-primary/60 hover:text-text"
                    >
                      {backgroundImage ? "Anderes Bild wählen" : "Originalplan hochladen"}
                    </button>
                    {backgroundImage && (
                      <>
                        <p className="px-1 text-[11px] text-text-muted">
                          Bild ziehen zum Verschieben, Ecke unten rechts zum
                          Skalieren.
                        </p>
                        <button
                          type="button"
                          onClick={clearBackgroundImage}
                          className="rounded-[var(--radius-sm)] border border-border px-2 py-1.5 text-xs font-medium text-error transition-colors hover:border-error/60"
                        >
                          Hintergrundbild entfernen
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <button
          type="button"
          onClick={toggleTreeView}
          title="Blendet alles außer Tree-Geräten und Tree-Verkabelung ab"
          className={cn(
            "flex w-full items-center justify-between gap-3 rounded-[var(--radius-sm)] border px-3 py-2 text-sm font-medium transition-colors",
            treeViewActive
              ? "border-primary/60 bg-primary/10 text-primary"
              : "border-border text-text-secondary hover:border-primary/40 hover:text-text",
          )}
        >
          <span className="flex items-center gap-2">
            <GitBranch className="h-4 w-4" />
            Tree View
          </span>
          {treeViewActive && <span className="text-xs font-semibold">An</span>}
        </button>
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
