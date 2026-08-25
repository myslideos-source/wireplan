"use client";

import { useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import { ZoomIn, ZoomOut, RotateCcw, Eye, EyeOff } from "lucide-react";
import type { Cable, CableType, CableGroup, Point } from "@/domain";
import { findSmartHomeModel } from "@/domain";
import { useEditorStore } from "@/features/editor/store";
import { floorExtentBox, devicePosition } from "@/features/editor/geometry-utils";
import { positionForRef } from "./compute-tree-cables";

const CABLE_GROUPS: { id: CableGroup; label: string; color: string }[] = [
  { id: "tree", label: "Tree (Loxone)", color: "#27AE60" },
  { id: "audio", label: "Lautsprecher", color: "#EB6F92" },
  { id: "network", label: "Netzwerk", color: "#9B51E0" },
  { id: "power", label: "Steckdosen / Stromkreise", color: "#F2C94C" },
];

// §12 (mockup) — the technical color code, applied to cable types by what
// they actually carry: lighting circuits get the Licht color, outlet/
// higher-current circuits get Steckdose/230V, network/Tree/Audio keep
// their own category colors, and anything §12 doesn't explicitly cover
// (empty conduit, generic 24V wiring, outdoor cable) falls back to
// Neutral rather than overclaiming a category it isn't.
const CABLE_COLORS: Record<CableType, string> = {
  "NYM-J 3x1,5": "#F2C94C",
  "NYM-J 3x2,5": "#EB5757",
  "NYM-J 5x1,5": "#F2C94C",
  "NYM-J 5x2,5": "#C0392B",
  "NYM-J 5x6": "#C0392B",
  CAT7: "#9B51E0",
  "CAT7 Duplex": "#9B51E0",
  "Tree Cable": "#27AE60",
  "24V-Leitung": "#7F8C8D",
  "Lautsprecherkabel 2x1,5": "#EB6F92",
  "Lautsprecherkabel 2x2,5": "#EB6F92",
  "Leerrohr M25": "#7F8C8D",
  "Außenkabel (NYY)": "#7F8C8D",
};

/** §104 — a device's Stromkreis (circuit) wasn't visible anywhere on this
 * canvas: every device rendered as the same flat gray circle regardless
 * of which loop-through circuit cable (§Phase15) it ended up sharing.
 * Once routing is calculated, color each device by its circuit instead —
 * a small deterministic palette hashed from `circuitGroupId` so the same
 * circuit always gets the same color without needing per-circuit color
 * data that doesn't exist in the domain model. Devices with no computed
 * circuit yet (nothing routed, or a single-device home-run that isn't a
 * "Stromkreis" in this sense — sensors/network/Tree/Audio) stay neutral
 * gray, same as before.
 */
const CIRCUIT_PALETTE = ["#2D9CDB", "#27AE60", "#F2994A", "#9B51E0", "#EB5757", "#56CCF2", "#BB6BD9", "#F2C94C"];
function circuitColor(circuitGroupId: string): string {
  let hash = 0;
  for (let i = 0; i < circuitGroupId.length; i++) hash = (hash * 31 + circuitGroupId.charCodeAt(i)) | 0;
  return CIRCUIT_PALETTE[Math.abs(hash) % CIRCUIT_PALETTE.length];
}

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 4;

export function RoutingCanvas({
  selectedCableId,
  onSelectCable,
}: {
  selectedCableId: string | null;
  onSelectCable: (id: string | null) => void;
}) {
  const rooms = useEditorStore((state) => state.rooms);
  const devices = useEditorStore((state) => state.devices);
  const smartHomeDevices = useEditorStore((state) => state.smartHomeDevices);
  const fixedConsumers = useEditorStore((state) => state.fixedConsumers);
  const backgroundImage = useEditorStore((state) => state.backgroundImage);
  const backgroundImageOpacity = useEditorStore((state) => state.backgroundImageOpacity);
  const distributionBoard = useEditorStore((state) => state.distributionBoard);
  const cables = useEditorStore((state) => state.cables);
  const treeJunctions = useEditorStore((state) => state.treeJunctions);
  const treeEdges = useEditorStore((state) => state.treeEdges);
  const visibleCableGroups = useEditorStore((state) => state.visibleCableGroups);
  const toggleCableGroup = useEditorStore((state) => state.toggleCableGroup);

  const box = floorExtentBox(rooms, backgroundImage);
  const boardPosition = distributionBoard ? distributionBoard.position : null;

  // A bare id (from `deviceIds`) can point at a regular ElectricalDevice,
  // a standalone SmartHomeDevice (e.g. a Tree device with no electrical
  // mount, or a speaker), or a FixedConsumer — all three live in separate
  // arrays, so every cable-endpoint lookup on this canvas goes through
  // this one place instead of only ever checking `devices`.
  function resolvePosition(id: string): Point | null {
    const device = devices.find((d) => d.id === id);
    if (device) return devicePosition(device);
    const smartHome = smartHomeDevices.find((d) => d.id === id);
    if (smartHome) return smartHome.position;
    const consumer = fixedConsumers.find((c) => c.id === id);
    if (consumer) return consumer.position;
    return null;
  }

  // §104 — this canvas had no way to move around at all (no zoom, no
  // pan): the viewBox was always the whole plan's fixed extent, which
  // forced everyone to eyeball a shrunk-to-fit plan instead of being
  // able to get closer to one area. Local view state only (not floor
  // data), same pattern as the Editor canvas.
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement>(null);
  const panStateRef = useRef<{
    startClientX: number;
    startClientY: number;
    startOffsetX: number;
    startOffsetY: number;
    scaleX: number;
    scaleY: number;
  } | null>(null);

  const vbWidth = box.width / zoom;
  const vbHeight = box.height / zoom;
  const centerX = box.minX + box.width / 2 + panOffset.x;
  const centerY = box.minY + box.height / 2 + panOffset.y;
  const viewBox = `${centerX - vbWidth / 2} ${centerY - vbHeight / 2} ${vbWidth} ${vbHeight}`;

  function handlePanMouseDown(event: ReactMouseEvent) {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    panStateRef.current = {
      startClientX: event.clientX,
      startClientY: event.clientY,
      startOffsetX: panOffset.x,
      startOffsetY: panOffset.y,
      scaleX: vbWidth / rect.width,
      scaleY: vbHeight / rect.height,
    };
    function handleMove(moveEvent: MouseEvent) {
      const current = panStateRef.current;
      if (!current) return;
      const dx = (moveEvent.clientX - current.startClientX) * current.scaleX;
      const dy = (moveEvent.clientY - current.startClientY) * current.scaleY;
      setPanOffset({ x: current.startOffsetX - dx, y: current.startOffsetY - dy });
    }
    function handleUp() {
      panStateRef.current = null;
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    }
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
  }

  // Tree bus cables have no single deviceId (§33) and are drawn separately
  // below — this lookup covers every cable this canvas draws per-device:
  // a classic single-device home-run (deviceId) or a room-circuit loop
  // cable shared by several devices (deviceIds, §Phase15).
  const cablesByDeviceId = new Map<string, Cable>();
  for (const cable of cables) {
    if (cable.deviceId) cablesByDeviceId.set(cable.deviceId, cable);
    for (const id of cable.deviceIds ?? []) cablesByDeviceId.set(id, cable);
  }

  return (
    <div className="relative h-full w-full overflow-hidden">
      <svg
        ref={svgRef}
        viewBox={viewBox}
        className="h-full w-full cursor-grab active:cursor-grabbing"
        onClick={() => onSelectCable(null)}
        onMouseDown={handlePanMouseDown}
      >
        {/* §Phase17.1 — the uploaded/locked plan image was missing from this
         * canvas entirely (only room-zone fills rendered), so the plan
         * "disappeared" the moment a user opened Routing. Rendered first,
         * behind every room/device/cable layer above it. */}
        {backgroundImage && (
          <image
            href={backgroundImage.dataUrl}
            x={backgroundImage.x}
            y={backgroundImage.y}
            width={backgroundImage.width}
            height={backgroundImage.height}
            opacity={backgroundImageOpacity}
            preserveAspectRatio="none"
          />
        )}

        <g opacity={0.4}>
          {rooms.map((room) => (
            <polygon
              key={room.id}
              points={room.polygon.map((p) => `${p.x},${p.y}`).join(" ")}
              fill="#E3EDE6"
              stroke="#B9CBBF"
              strokeWidth={6}
            />
          ))}
        </g>

        {cables.map((cable) => {
          if (!boardPosition) return null;
          if (!visibleCableGroups[cable.kind]) return null;
          const isSelected = selectedCableId === cable.id;
          const dimmed = selectedCableId !== null && !isSelected;
          // §112 — a real home-run (network/audio/power's own lead) is
          // solid; anything that hops through several devices on one
          // shared cable (a Tree bus or a looped-through circuit) is
          // dashed, so the "never durchgeschleift" network rule is
          // visible at a glance rather than only in the cable list.
          const dashed = cable.kind === "tree" || cable.kind === "power";
          const strokeWidth = isSelected ? 12 : 6;

          // A Tree branch with any manually-drawn edges (§61) is a real
          // graph (it can fork at a junction) — draw each edge as its own
          // Manhattan segment instead of forcing it through the linear
          // board->device->device chain below, which can't represent a
          // fork.
          if (cable.treeBranchId) {
            const branchEdges = treeEdges.filter((e) => e.treeBranchId === cable.treeBranchId);
            if (branchEdges.length > 0) {
              return (
                <g key={cable.id}>
                  {branchEdges.map((edge) => {
                    const from = positionForRef(edge.fromRef, boardPosition, devices, smartHomeDevices, treeJunctions);
                    const to = positionForRef(edge.toRef, boardPosition, devices, smartHomeDevices, treeJunctions);
                    if (!from || !to) return null;
                    const d = `M ${from.x} ${from.y} L ${to.x} ${from.y} L ${to.x} ${to.y}`;
                    return (
                      <path
                        key={edge.id}
                        d={d}
                        fill="none"
                        stroke={CABLE_COLORS[cable.type]}
                        strokeWidth={strokeWidth}
                        strokeDasharray="24 14"
                        opacity={dimmed ? 0.2 : 1}
                        className="cursor-pointer"
                        onClick={(event) => {
                          event.stopPropagation();
                          onSelectCable(cable.id);
                        }}
                      />
                    );
                  })}
                </g>
              );
            }
          }

          // A room-circuit loop cable (§Phase15) or a Tree bus hops board
          // -> device -> device -> ... in bus order, drawn as one
          // corner-to-corner segment per hop instead of the single-device
          // home-run below.
          if (cable.deviceIds) {
            const positions = cable.deviceIds
              .map((id) => resolvePosition(id))
              .filter((p): p is Point => p !== null);
            if (positions.length === 0) return null;
            let d = `M ${boardPosition.x} ${boardPosition.y}`;
            let current = boardPosition;
            for (const position of positions) {
              d += ` L ${position.x} ${current.y} L ${position.x} ${position.y}`;
              current = position;
            }
            return (
              <path
                key={cable.id}
                d={d}
                fill="none"
                stroke={CABLE_COLORS[cable.type]}
                strokeWidth={strokeWidth}
                strokeDasharray={dashed ? "24 14" : undefined}
                opacity={dimmed ? 0.2 : 1}
                className="cursor-pointer"
                onClick={(event) => {
                  event.stopPropagation();
                  onSelectCable(cable.id);
                }}
              />
            );
          }

          const position = cable.deviceId ? resolvePosition(cable.deviceId) : null;
          if (!position) return null;
          // Every mode renders as the simple corner-to-corner line it was
          // always computed as (§47 — Manhattan distance, no wall routing).
          const d = `M ${boardPosition.x} ${boardPosition.y} L ${position.x} ${boardPosition.y} L ${position.x} ${position.y}`;
          return (
            <path
              key={cable.id}
              d={d}
              fill="none"
              stroke={CABLE_COLORS[cable.type]}
              strokeWidth={strokeWidth}
              strokeDasharray={dashed ? "24 14" : undefined}
              opacity={dimmed ? 0.2 : 1}
              className="cursor-pointer"
              onClick={(event) => {
                event.stopPropagation();
                onSelectCable(cable.id);
              }}
            />
          );
        })}

        {devices.map((device) => {
          const position = devicePosition(device);
          const cable = cablesByDeviceId.get(device.id);
          const dimmed = selectedCableId !== null && cable?.id !== selectedCableId;
          const color = cable?.circuitGroupId ? circuitColor(cable.circuitGroupId) : "#7F8C8D";
          return (
            <circle
              key={device.id}
              cx={position.x}
              cy={position.y}
              r={42}
              fill="#FFFFFF"
              stroke={color}
              strokeWidth={7}
              opacity={dimmed ? 0.3 : 1}
            />
          );
        })}

        {/* §Phase17.1 — standalone Smart-Home devices and fixed consumers
         * were placed on the plan but never drawn here at all, so anything
         * that wasn't a plain ElectricalDevice silently vanished on this
         * canvas even though it's part of what was actually planned. */}
        {smartHomeDevices.map((device) => {
          const model = findSmartHomeModel(device.modelId);
          const color = model?.color ?? "#2D9CDB";
          const cable = cablesByDeviceId.get(device.id);
          const dimmed = selectedCableId !== null && cable?.id !== selectedCableId;
          return (
            <circle
              key={device.id}
              cx={device.position.x}
              cy={device.position.y}
              r={42}
              fill={color}
              fillOpacity={0.18}
              stroke={color}
              strokeWidth={7}
              opacity={dimmed ? 0.3 : 1}
            />
          );
        })}

        {fixedConsumers.map((consumer) => {
          const cable = cablesByDeviceId.get(consumer.id);
          const dimmed = selectedCableId !== null && cable?.id !== selectedCableId;
          return (
            <rect
              key={consumer.id}
              x={consumer.position.x - 38}
              y={consumer.position.y - 38}
              width={76}
              height={76}
              fill="#FFFFFF"
              stroke="#C0392B"
              strokeWidth={7}
              opacity={dimmed ? 0.3 : 1}
            />
          );
        })}

        {boardPosition && (
          <rect
            x={boardPosition.x - 200}
            y={boardPosition.y - 125}
            width={400}
            height={250}
            fill="rgba(39,174,96,0.15)"
            stroke="#27AE60"
            strokeWidth={10}
          />
        )}
      </svg>

      {/* §112 — independent show/hide per wiring group, so one type (e.g.
       * just the Tree bus) can be reviewed on its own instead of always
       * seeing every cable at once. */}
      <div className="absolute right-3 top-3 z-10 flex flex-col gap-0.5 rounded-[var(--radius-sm)] border border-border bg-panel/95 p-2 text-xs shadow-[var(--shadow-sm)] backdrop-blur-sm">
        <p className="px-1.5 pb-1 text-[10px] font-semibold uppercase tracking-wide text-text-muted">
          Leitungsgruppen
        </p>
        {CABLE_GROUPS.map((group) => {
          const visible = visibleCableGroups[group.id];
          return (
            <button
              key={group.id}
              type="button"
              onClick={() => toggleCableGroup(group.id)}
              className="flex items-center justify-between gap-4 rounded-[var(--radius-sm)] px-1.5 py-1 font-medium text-text-secondary transition-colors hover:bg-panel-elevated hover:text-text"
            >
              <span className="flex items-center gap-1.5">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: group.color, opacity: visible ? 1 : 0.35 }}
                />
                {group.label}
              </span>
              {visible ? (
                <Eye className="h-3.5 w-3.5" />
              ) : (
                <EyeOff className="h-3.5 w-3.5 text-text-muted/50" />
              )}
            </button>
          );
        })}
      </div>

      <div className="absolute bottom-2 right-2 flex items-center gap-0.5 rounded-[var(--radius-sm)] border border-border bg-panel/95 p-1 shadow-sm backdrop-blur-sm">
        <button
          type="button"
          aria-label="Verkleinern"
          onClick={() => setZoom((z) => Math.max(MIN_ZOOM, z - 0.25))}
          className="flex h-6 w-6 items-center justify-center rounded-[var(--radius-sm)] text-text-secondary hover:bg-panel-elevated hover:text-text"
        >
          <ZoomOut className="h-3.5 w-3.5" />
        </button>
        <span className="w-9 text-center text-[11px] tabular-nums text-text-muted">
          {Math.round(zoom * 100)}%
        </span>
        <button
          type="button"
          aria-label="Vergrößern"
          onClick={() => setZoom((z) => Math.min(MAX_ZOOM, z + 0.25))}
          className="flex h-6 w-6 items-center justify-center rounded-[var(--radius-sm)] text-text-secondary hover:bg-panel-elevated hover:text-text"
        >
          <ZoomIn className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          aria-label="Ansicht zurücksetzen"
          onClick={() => {
            setZoom(1);
            setPanOffset({ x: 0, y: 0 });
          }}
          className="flex h-6 w-6 items-center justify-center rounded-[var(--radius-sm)] text-text-secondary hover:bg-panel-elevated hover:text-text"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
