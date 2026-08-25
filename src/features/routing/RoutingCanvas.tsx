"use client";

import type { Cable, CableType } from "@/domain";
import { findSmartHomeModel } from "@/domain";
import { useEditorStore } from "@/features/editor/store";
import { floorExtentBox, devicePosition } from "@/features/editor/geometry-utils";

const CABLE_COLORS: Record<CableType, string> = {
  "NYM-J 3x1,5": "#D9A441",
  "NYM-J 3x2,5": "#C4534A",
  "NYM-J 5x1,5": "#D9A441",
  "NYM-J 5x2,5": "#C4534A",
  "NYM-J 5x6": "#C4534A",
  CAT7: "#4A8FA8",
  "CAT7 Duplex": "#4A8FA8",
  "Tree Cable": "#7A9D6E",
  "24V-Leitung": "#8F6FB8",
  "Lautsprecherkabel 2x1,5": "#B8698A",
  "Lautsprecherkabel 2x2,5": "#B8698A",
  "Leerrohr M25": "#8A8272",
  "Außenkabel (NYY)": "#8B5E3C",
};

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
  const viewBox = `${box.minX} ${box.minY} ${box.width} ${box.height}`;
  const boardPosition = distributionBoard ? distributionBoard.position : null;

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
    <svg
      viewBox={viewBox}
      className="h-full w-full"
      onClick={() => onSelectCable(null)}
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
            fill="#EFE7D8"
            stroke="#C9BFA8"
            strokeWidth={8}
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
              strokeWidth={isSelected ? 50 : 30}
              strokeDasharray="90 50"
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
            strokeWidth={isSelected ? 50 : 30}
            strokeDasharray={cable.type === "CAT7" ? undefined : "90 50"}
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
        return (
          <circle
            key={device.id}
            cx={position.x}
            cy={position.y}
            r={110}
            fill="#FFFFFF"
            stroke="#6B6459"
            strokeWidth={16}
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
        const color = model?.color ?? "#4A8FA8";
        const cable = cablesByDeviceId.get(device.id);
        const dimmed = selectedCableId !== null && cable?.id !== selectedCableId;
        return (
          <circle
            key={device.id}
            cx={device.position.x}
            cy={device.position.y}
            r={110}
            fill={color}
            fillOpacity={0.18}
            stroke={color}
            strokeWidth={16}
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
            x={consumer.position.x - 100}
            y={consumer.position.y - 100}
            width={200}
            height={200}
            fill="#FFFFFF"
            stroke="#C4534A"
            strokeWidth={16}
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
          fill="rgba(122,157,110,0.15)"
          stroke="#7A9D6E"
          strokeWidth={24}
        />
      )}
    </svg>
  );
}
