"use client";

import { useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import { ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import type { Cable, CableType } from "@/domain";
import { findSmartHomeModel } from "@/domain";
import { useEditorStore } from "@/features/editor/store";
import { floorExtentBox, devicePosition } from "@/features/editor/geometry-utils";

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

  const box = floorExtentBox(rooms, backgroundImage);
  const boardPosition = distributionBoard ? distributionBoard.position : null;

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
          // A room-circuit loop cable (§Phase15) hops board -> device -> device
          // -> ... in bus order, drawn as one corner-to-corner segment per hop
          // instead of the single-device home-run below.
          if (cable.deviceIds) {
            const positions = cable.deviceIds
              .map((id) => devices.find((d) => d.id === id))
              .filter((d): d is NonNullable<typeof d> => d !== undefined)
              .map((d) => devicePosition(d));
            if (positions.length === 0) return null;
            const isSelected = selectedCableId === cable.id;
            const dimmed = selectedCableId !== null && !isSelected;
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
                strokeWidth={isSelected ? 32 : 18}
                strokeDasharray="55 30"
                opacity={dimmed ? 0.2 : 1}
                className="cursor-pointer"
                onClick={(event) => {
                  event.stopPropagation();
                  onSelectCable(cable.id);
                }}
              />
            );
          }

          const device = devices.find((d) => d.id === cable.deviceId);
          const position = device && devicePosition(device);
          if (!position) return null;
          const isSelected = selectedCableId === cable.id;
          const dimmed = selectedCableId !== null && !isSelected;
          // Every mode renders as the simple corner-to-corner line it was
          // always computed as (§47 — Manhattan distance, no wall routing).
          const d = `M ${boardPosition.x} ${boardPosition.y} L ${position.x} ${boardPosition.y} L ${position.x} ${position.y}`;
          return (
            <path
              key={cable.id}
              d={d}
              fill="none"
              stroke={CABLE_COLORS[cable.type]}
              strokeWidth={isSelected ? 32 : 18}
              strokeDasharray={cable.type === "CAT7" ? undefined : "55 30"}
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
