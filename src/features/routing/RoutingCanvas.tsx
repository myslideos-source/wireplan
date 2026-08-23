"use client";

import type { Cable, CableType } from "@/domain";
import { useEditorStore } from "@/features/editor/store";
import { floorExtentBox, devicePosition } from "@/features/editor/geometry-utils";

const CABLE_COLORS: Record<CableType, string> = {
  "NYM-J 3x1,5": "#D9A441",
  "NYM-J 3x2,5": "#C4534A",
  "NYM-J 5x2,5": "#C4534A",
  "NYM-J 5x6": "#C4534A",
  CAT7: "#4A8FA8",
  "CAT7 Duplex": "#4A8FA8",
  "Tree Cable": "#7A9D6E",
  "Lautsprecherkabel 2x1,5": "#B8698A",
  "Lautsprecherkabel 2x2,5": "#B8698A",
  "Leerrohr M25": "#8A8272",
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
  const backgroundImage = useEditorStore((state) => state.backgroundImage);
  const distributionBoard = useEditorStore((state) => state.distributionBoard);
  const cables = useEditorStore((state) => state.cables);

  const box = floorExtentBox(rooms, backgroundImage);
  const viewBox = `${box.minX} ${box.minY} ${box.width} ${box.height}`;
  const boardPosition = distributionBoard ? distributionBoard.position : null;

  // Tree bus cables have no single deviceId (§33) — this device-to-cable
  // lookup only covers the classic star cables this canvas visualizes.
  const cablesByDeviceId = new Map<string, Cable>(
    cables.filter((c) => c.deviceId).map((c) => [c.deviceId as string, c]),
  );

  return (
    <svg
      viewBox={viewBox}
      className="h-full w-full"
      onClick={() => onSelectCable(null)}
    >
      <g opacity={0.5}>
        {rooms.map((room) => (
          <polygon
            key={room.id}
            points={room.polygon.map((p) => `${p.x},${p.y}`).join(" ")}
            fill="#EFE7D8"
          />
        ))}
      </g>

      {cables.map((cable) => {
        const device = devices.find((d) => d.id === cable.deviceId);
        const position = device && devicePosition(device);
        if (!position || !boardPosition) return null;
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
