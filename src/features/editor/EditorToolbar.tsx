"use client";

import { useMemo, useRef, useState } from "react";
import {
  MousePointer2,
  Square,
  Plug,
  Lightbulb,
  ToggleLeft,
  Radar,
  Wifi,
  Server,
  Home,
  Cable,
  Image as ImageIcon,
  Crop,
  Eye,
  EyeOff,
  GitBranch,
  GitFork,
  Link2,
  Zap,
  Volume2,
  Network,
  Layers,
  Search,
  ChevronDown,
  Star,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { isFeatureEnabled, type FeatureFlag } from "@/lib/feature-flags";
import {
  FIXED_CONSUMER_LABELS,
  NETWORK_DEVICE_LABELS,
  type FixedConsumerType,
  type NetworkDeviceSubtype,
} from "@/domain";
import { useEditorStore, type EditorTool, type LayerId, type ViewMode } from "./store";
import { DRAG_TOOL_MIME } from "./drag-tool";
import { roomZoneColor } from "./geometry-utils";
import { formatArea } from "@/lib/utils";

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
  "junction",
];

/** §66-71 — a focused view dims everything except one concern. */
const VIEW_MODES: { id: ViewMode; label: string; icon: LucideIcon; title: string }[] = [
  { id: "alle", label: "Alle", icon: Layers, title: "Alles normal sichtbar" },
  {
    id: "tree",
    label: "Tree View",
    icon: GitBranch,
    title: "Blendet alles außer Tree-Geräten und Tree-Verkabelung ab",
  },
  { id: "audio", label: "Audio View", icon: Volume2, title: "Blendet alles außer Lautsprechern ab" },
  { id: "network", label: "Network View", icon: Network, title: "Blendet alles außer Netzwerkdosen ab" },
  { id: "power", label: "Power View", icon: Zap, title: "Blendet alles außer Steckdosen und Verbrauchern ab" },
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
  requiresBackground?: boolean;
}

const TOOLS: ToolDef[] = [
  { id: "room", label: "Raum", icon: Square },
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
  { id: "smarthome", label: "Smart Home (Loxone-Katalog)", icon: Home, flag: "LOXONE" },
  { id: "consumer", label: "Fester Verbraucher", icon: Zap, flag: "ELECTRICAL_EDITOR" },
  { id: "junction", label: "Tree-Verzweigung", icon: GitFork, flag: "LOXONE" },
  {
    id: "treeConnect",
    label: "Tree-Äste verbinden",
    icon: Link2,
    flag: "LOXONE",
    note: "Zwei Punkte nacheinander anklicken, um sie manuell zu verbinden",
  },
  { id: "background", label: "Hintergrundbild", icon: ImageIcon },
  {
    id: "crop",
    label: "Zuschneiden",
    icon: Crop,
    requiresBackground: true,
    note: "Zuerst einen Originalplan hochladen",
  },
  { id: "cable", label: "Kabel / Leitung", icon: Cable, flag: "CABLE_ROUTING" },
];

const TOOLS_BY_ID = new Map(TOOLS.map((tool) => [tool.id, tool]));

/** §5 (mockup) — the categories a Loxone electrical planner's component
 * library is grouped by. Our existing toolset doesn't have a discrete
 * tool for every one of these (some device types — Beschattung, Heizung/
 * Klima, Audio, Sicherheit — are only reachable today via the "Smart
 * Home"-Katalog rather than a dedicated placement tool), so those
 * categories stay present but point at the catalog instead of listing a
 * tool of their own. Nothing is hidden — every tool from before still
 * appears in exactly one category. */
const CATEGORIES: { label: string; toolIds: EditorTool[]; catalogHint?: boolean }[] = [
  { label: "Beleuchtung", toolIds: ["light"] },
  { label: "Steuerung", toolIds: ["switch"] },
  { label: "Sensoren", toolIds: ["sensor"] },
  { label: "Steckdosen", toolIds: ["outlet"] },
  { label: "Beschattung", toolIds: [], catalogHint: true },
  { label: "Heizung / Klima", toolIds: [], catalogHint: true },
  { label: "Audio", toolIds: [], catalogHint: true },
  { label: "Netzwerk", toolIds: ["network"] },
  { label: "Sicherheit", toolIds: [], catalogHint: true },
  { label: "Verbraucher", toolIds: ["consumer"] },
  { label: "Schaltschrank", toolIds: ["board"] },
  {
    label: "Sonstiges",
    toolIds: ["room", "smarthome", "junction", "treeConnect", "background", "crop", "cable"],
  },
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
  const backgroundImage = useEditorStore((state) => state.backgroundImage);
  const startCrop = useEditorStore((state) => state.startCrop);
  const setBackgroundImage = useEditorStore((state) => state.setBackgroundImage);
  const clearBackgroundImage = useEditorStore((state) => state.clearBackgroundImage);
  const backgroundImageOpacity = useEditorStore((state) => state.backgroundImageOpacity);
  const setBackgroundImageOpacity = useEditorStore((state) => state.setBackgroundImageOpacity);
  const viewMode = useEditorStore((state) => state.viewMode);
  const setViewMode = useEditorStore((state) => state.setViewMode);
  const spotArrayCount = useEditorStore((state) => state.spotArrayCount);
  const setSpotArrayCount = useEditorStore((state) => state.setSpotArrayCount);
  const spotArrayArrangement = useEditorStore((state) => state.spotArrayArrangement);
  const setSpotArrayArrangement = useEditorStore((state) => state.setSpotArrayArrangement);
  const fixedConsumerPlacementType = useEditorStore((state) => state.fixedConsumerPlacementType);
  const setFixedConsumerPlacementType = useEditorStore((state) => state.setFixedConsumerPlacementType);
  const fixedConsumerCustomLabel = useEditorStore((state) => state.fixedConsumerCustomLabel);
  const setFixedConsumerCustomLabel = useEditorStore((state) => state.setFixedConsumerCustomLabel);
  const networkDevicePlacementSubtype = useEditorStore((state) => state.networkDevicePlacementSubtype);
  const setNetworkDevicePlacementSubtype = useEditorStore(
    (state) => state.setNetworkDevicePlacementSubtype,
  );
  const treeConnectPendingNodeRef = useEditorStore((state) => state.treeConnectPendingNodeRef);
  const cancelTreeConnect = useEditorStore((state) => state.cancelTreeConnect);
  const leftPanelTab = useEditorStore((state) => state.leftPanelTab);
  const setLeftPanelTab = useEditorStore((state) => state.setLeftPanelTab);
  const rooms = useEditorStore((state) => state.rooms);
  const selected = useEditorStore((state) => state.selected);
  const select = useEditorStore((state) => state.select);
  const drawingRoomPoints = useEditorStore((state) => state.drawingRoomPoints);
  const cancelRoomDraw = useEditorStore((state) => state.cancelRoomDraw);
  const loxoneEnabled = isFeatureEnabled("LOXONE");
  const backgroundInputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState("");
  const [openCategory, setOpenCategory] = useState<string | null>(CATEGORIES[0].label);
  const [libraryTab, setLibraryTab] = useState<"komponenten" | "favoriten">("komponenten");
  const [favorites, setFavorites] = useState<Set<EditorTool>>(new Set());

  function toggleFavorite(id: EditorTool) {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

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

  const matchingIds = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    return new Set(TOOLS.filter((tool) => tool.label.toLowerCase().includes(q)).map((tool) => tool.id));
  }, [query]);

  /** One tool row — icon, label, favorite star, drag/click wiring — plus
   * its inline placement-options mini-form when it's the active tool.
   * Shared by the category accordion, the search results, and the
   * Favoriten tab so none of that wiring is duplicated three times. */
  function renderTool(tool: ToolDef) {
    const flagEnabled = !tool.flag || isFeatureEnabled(tool.flag);
    const missingTechnikraum = tool.requiresTechnikraum && technikraumRoomId === null;
    const missingBackground = tool.requiresBackground && !backgroundImage;
    const enabled = flagEnabled && !missingTechnikraum && !missingBackground;
    const Icon = tool.icon;
    const disabled = !enabled;
    const isFavorite = favorites.has(tool.id);

    return (
      <div key={tool.id} className="flex flex-col gap-1">
        <div
          className={cn(
            "group flex items-center rounded-[var(--radius-sm)] transition-colors",
            activeTool === tool.id && enabled ? "bg-primary-soft" : "hover:bg-panel-elevated",
          )}
        >
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
                : missingTechnikraum || missingBackground
                  ? tool.note
                  : enabled && DRAGGABLE_TOOLS.includes(tool.id)
                    ? "Klicken zum Aktivieren oder direkt in den Plan ziehen"
                    : undefined
            }
            onClick={() => (tool.id === "crop" ? startCrop() : setTool(tool.id))}
            className={cn(
              "flex flex-1 items-center gap-2.5 px-2.5 py-2 text-left text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40",
              enabled && DRAGGABLE_TOOLS.includes(tool.id) && "cursor-grab active:cursor-grabbing",
              activeTool === tool.id && enabled ? "text-primary" : "text-text-secondary",
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="truncate">{tool.label}</span>
          </button>
          <button
            type="button"
            onClick={() => toggleFavorite(tool.id)}
            aria-label={isFavorite ? "Aus Favoriten entfernen" : "Zu Favoriten hinzufügen"}
            className={cn(
              "mr-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-[var(--radius-sm)] opacity-0 transition-opacity group-hover:opacity-100",
              isFavorite && "opacity-100",
            )}
          >
            <Star
              className={cn("h-3.5 w-3.5", isFavorite ? "fill-warning text-warning" : "text-text-muted")}
            />
          </button>
        </div>

        {tool.id === "smarthome" && loxoneEnabled && activeTool === "smarthome" && (
          <p className="mx-1 px-1 text-[11px] text-text-muted">
            Gerät oberhalb des Grundrisses auswählen.
          </p>
        )}
        {tool.id === "consumer" && activeTool === "consumer" && (
          <div className="mx-1 flex flex-col gap-1.5">
            <select
              value={fixedConsumerPlacementType}
              onChange={(event) => setFixedConsumerPlacementType(event.target.value as FixedConsumerType)}
              className="rounded-[var(--radius-sm)] border border-border bg-panel px-2 py-1.5 text-xs text-text outline-none focus:border-primary/60"
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
                className="rounded-[var(--radius-sm)] border border-border bg-panel px-2 py-1.5 text-xs text-text outline-none focus:border-primary/60"
              />
            )}
          </div>
        )}
        {tool.id === "network" && activeTool === "network" && (
          <select
            value={networkDevicePlacementSubtype}
            onChange={(event) =>
              setNetworkDevicePlacementSubtype(event.target.value as NetworkDeviceSubtype)
            }
            className="mx-1 rounded-[var(--radius-sm)] border border-border bg-panel px-2 py-1.5 text-xs text-text outline-none focus:border-primary/60"
          >
            {(Object.entries(NETWORK_DEVICE_LABELS) as [NetworkDeviceSubtype, string][]).map(
              ([subtype, label]) => (
                <option key={subtype} value={subtype}>
                  {label}
                </option>
              ),
            )}
          </select>
        )}
        {tool.id === "room" && activeTool === "room" && (
          <div className="mx-1 flex flex-col gap-1.5">
            <p className="px-1 text-[11px] text-text-muted">
              {drawingRoomPoints && drawingRoomPoints.length >= 3
                ? "Am ersten Punkt klicken zum Schließen, oder Enter drücken."
                : "Ecken anklicken, am ersten Punkt schließen. Esc zum Abbrechen, Enter zum Fertigstellen."}
            </p>
            {drawingRoomPoints && (
              <button
                type="button"
                onClick={cancelRoomDraw}
                className="rounded-[var(--radius-sm)] border border-border px-2 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:border-primary/60 hover:text-text"
              >
                Abbrechen
              </button>
            )}
          </div>
        )}
        {tool.id === "treeConnect" && activeTool === "treeConnect" && (
          <div className="mx-1 flex flex-col gap-1.5">
            <p className="px-1 text-[11px] text-text-muted">
              {treeConnectPendingNodeRef
                ? "Erster Punkt gewählt — jetzt den zweiten Punkt (Schaltschrank, Gerät oder Verzweigung) anklicken."
                : "Ersten Punkt anklicken (Schaltschrank, Gerät oder Verzweigung)."}
            </p>
            {treeConnectPendingNodeRef && (
              <button
                type="button"
                onClick={cancelTreeConnect}
                className="rounded-[var(--radius-sm)] border border-border px-2 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:border-primary/60 hover:text-text"
              >
                Abbrechen
              </button>
            )}
          </div>
        )}
        {tool.id === "light" && activeTool === "light" && (
          <div className="mx-1 flex flex-col gap-1.5">
            <p className="px-1 text-[11px] text-text-muted">Mehrere Spots platzieren</p>
            <select
              value={spotArrayCount}
              onChange={(event) => setSpotArrayCount(Number(event.target.value))}
              className="rounded-[var(--radius-sm)] border border-border bg-panel px-2 py-1.5 text-xs text-text outline-none focus:border-primary/60"
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
                className="rounded-[var(--radius-sm)] border border-border bg-panel px-2 py-1.5 text-xs text-text outline-none focus:border-primary/60"
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
                  Bild ziehen zum Verschieben, Ecke unten rechts zum Skalieren.
                </p>
                <label className="flex flex-col gap-1 px-1 text-[11px] text-text-muted">
                  Plan Hintergrund — {Math.round(backgroundImageOpacity * 100)}%
                  <input
                    type="range"
                    min={30}
                    max={100}
                    value={Math.round(backgroundImageOpacity * 100)}
                    onChange={(event) => setBackgroundImageOpacity(Number(event.target.value) / 100)}
                    className="accent-primary"
                  />
                </label>
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
  }

  const favoriteTools = TOOLS.filter((tool) => favorites.has(tool.id));

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-border bg-panel">
      <div className="flex border-b border-border p-2">
        <button
          type="button"
          onClick={() => setLeftPanelTab("elemente")}
          className={cn(
            "flex-1 rounded-[var(--radius-sm)] px-3 py-1.5 text-sm font-medium transition-colors",
            leftPanelTab === "elemente"
              ? "bg-primary-soft text-primary"
              : "text-text-secondary hover:text-text",
          )}
        >
          Elemente
        </button>
        <button
          type="button"
          onClick={() => setLeftPanelTab("raeume")}
          className={cn(
            "flex-1 rounded-[var(--radius-sm)] px-3 py-1.5 text-sm font-medium transition-colors",
            leftPanelTab === "raeume"
              ? "bg-primary-soft text-primary"
              : "text-text-secondary hover:text-text",
          )}
        >
          Räume
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto scrollbar-thin">
        {leftPanelTab === "raeume" && (
          <div className="p-3">
            <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
              Räume definieren
            </p>
            <p className="px-2 pb-3 text-xs text-text-muted">
              Räume sind farblich hervorgehoben. Einen Raum anklicken, um ihn im Grundriss
              auszuwählen und Details rechts zu bearbeiten.
            </p>
            <div className="flex flex-col gap-0.5">
              {rooms.map((room, index) => {
                const isSelected = selected?.type === "room" && selected.id === room.id;
                return (
                  <button
                    key={room.id}
                    type="button"
                    onClick={() => select({ type: "room", id: room.id })}
                    className={cn(
                      "flex items-center gap-2.5 rounded-[var(--radius-sm)] px-3 py-2 text-left text-sm font-medium transition-colors",
                      isSelected
                        ? "bg-primary-soft text-primary"
                        : "text-text-secondary hover:bg-panel-elevated hover:text-text",
                    )}
                  >
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: roomZoneColor(index) }}
                    />
                    <span className="flex-1 truncate">{room.name}</span>
                    <span className="tabular-nums-font text-xs text-text-muted">
                      {formatArea(room.area)}
                    </span>
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => setTool("room")}
              className={cn(
                "mt-3 flex w-full items-center justify-center gap-2 rounded-[var(--radius-sm)] border border-border px-3 py-2 text-sm font-medium transition-colors",
                activeTool === "room"
                  ? "border-primary/60 bg-primary-soft text-primary"
                  : "text-text-secondary hover:border-primary/60 hover:text-text",
              )}
            >
              <Square className="h-4 w-4" />
              Raum hinzufügen
            </button>
            {activeTool === "room" && (
              <p className="mt-2 px-1 text-[11px] text-text-muted">
                {drawingRoomPoints && drawingRoomPoints.length >= 3
                  ? "Am ersten Punkt (hell markiert) klicken zum Schließen, oder Enter drücken."
                  : "Ecken im Grundriss anklicken. Esc zum Abbrechen."}
              </p>
            )}
          </div>
        )}

        {leftPanelTab === "elemente" && (
          <>
            <button
              type="button"
              onClick={() => setTool("select")}
              className={cn(
                "m-2 flex items-center gap-2.5 rounded-[var(--radius-sm)] border px-3 py-2 text-sm font-medium transition-colors",
                activeTool === "select"
                  ? "border-primary/40 bg-primary-soft text-primary"
                  : "border-border text-text-secondary hover:border-primary/40 hover:text-text",
              )}
            >
              <MousePointer2 className="h-4 w-4" />
              Auswählen
            </button>

            <div className="relative mx-2 mb-2">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Komponente suchen…"
                className="w-full rounded-[var(--radius-sm)] border border-border bg-bg py-1.5 pl-8 pr-3 text-sm text-text outline-none focus:border-primary/60"
              />
            </div>

            <div className="mx-2 mb-2 flex rounded-[var(--radius-sm)] border border-border p-0.5">
              <button
                type="button"
                onClick={() => setLibraryTab("komponenten")}
                className={cn(
                  "flex-1 rounded-[calc(var(--radius-sm)-2px)] py-1 text-xs font-medium transition-colors",
                  libraryTab === "komponenten"
                    ? "bg-primary-soft text-primary"
                    : "text-text-secondary hover:text-text",
                )}
              >
                Komponenten
              </button>
              <button
                type="button"
                onClick={() => setLibraryTab("favoriten")}
                className={cn(
                  "flex-1 rounded-[calc(var(--radius-sm)-2px)] py-1 text-xs font-medium transition-colors",
                  libraryTab === "favoriten"
                    ? "bg-primary-soft text-primary"
                    : "text-text-secondary hover:text-text",
                )}
              >
                Favoriten
              </button>
            </div>

            <div className="flex flex-col gap-0.5 px-2 pb-3">
              {libraryTab === "favoriten" ? (
                favoriteTools.length > 0 ? (
                  favoriteTools.map((tool) => renderTool(tool))
                ) : (
                  <p className="px-2 py-4 text-center text-xs text-text-muted">
                    Noch keine Favoriten — Stern-Symbol an einer Komponente anklicken.
                  </p>
                )
              ) : matchingIds ? (
                TOOLS.filter((tool) => matchingIds.has(tool.id)).length > 0 ? (
                  TOOLS.filter((tool) => matchingIds.has(tool.id)).map((tool) => renderTool(tool))
                ) : (
                  <p className="px-2 py-4 text-center text-xs text-text-muted">
                    Keine Komponente für „{query}“ gefunden.
                  </p>
                )
              ) : (
                CATEGORIES.map((category) => {
                  const isOpen = openCategory === category.label;
                  const tools = category.toolIds
                    .map((id) => TOOLS_BY_ID.get(id))
                    .filter((t): t is ToolDef => Boolean(t));
                  return (
                    <div key={category.label} className="border-b border-border-subtle last:border-b-0">
                      <button
                        type="button"
                        onClick={() => setOpenCategory(isOpen ? null : category.label)}
                        className="flex w-full items-center justify-between gap-2 py-2 text-left text-xs font-semibold uppercase tracking-wide text-text-secondary"
                      >
                        {category.label}
                        <ChevronDown
                          className={cn(
                            "h-3.5 w-3.5 shrink-0 text-text-muted transition-transform",
                            isOpen && "rotate-180",
                          )}
                        />
                      </button>
                      {isOpen && (
                        <div className="flex flex-col gap-0.5 pb-2">
                          {tools.length > 0 ? (
                            tools.map((tool) => renderTool(tool))
                          ) : (
                            <p className="px-2.5 py-1.5 text-xs text-text-muted">
                              Über „Smart Home (Loxone-Katalog)&quot; unter Sonstiges verfügbar.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <div className="border-t border-border p-3">
              <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
                Ansicht
              </p>
              <div className="flex flex-col gap-0.5">
                {VIEW_MODES.map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => setViewMode(mode.id)}
                    title={mode.title}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-[var(--radius-sm)] px-3 py-2 text-sm font-medium transition-colors",
                      viewMode === mode.id
                        ? "bg-primary-soft text-primary"
                        : "text-text-secondary hover:bg-panel-elevated hover:text-text",
                    )}
                  >
                    <mode.icon className="h-4 w-4 shrink-0" />
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-border p-3">
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
          </>
        )}
      </div>
    </aside>
  );
}
