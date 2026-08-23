"use client";

import type { Cable, CableType } from "@/domain";
import { useEditorStore } from "@/features/editor/store";
import { wallsBoundingBox, devicePosition, pointAtOffset } from "@/features/editor/geometry-utils";

const CABLE_COLORS: Record<CableType, string> = {
  "NYM-J 3x1,5": "#e9ba4d",
  "NYM-J 3x2,5": "#f26060",
  "NYM-J 5x2,5": "#f26060",
  "NYM-J 5x6": "#f26060",
  CAT7: "#25b7f2",
  "Tree Cable": "#68d56b",
  "Lautsprecherkabel 2x1,5": "#f472b6",
  "Lautsprecherkabel 2x2,5": "#f472b6",
};

export function RoutingCanvas({
  selectedCableId,
  onSelectCable,
}: {
  selectedCableId: string | null;
  onSelectCable: (id: string | null) => void;
}) {
  const walls = useEditorStore((state) => state.walls);
  const rooms = useEditorStore((state) => state.rooms);
  const devices = useEditorStore((state) => state.devices);
  const distributionBoard = useEditorStore((state) => state.distributionBoard);
  const cables = useEditorStore((state) => state.cables);

  const box = wallsBoundingBox(walls);
  const viewBox = `${box.minX} ${box.minY} ${box.width} ${box.height}`;
  const boardWall = distributionBoard && walls.find((w) => w.id === distributionBoard.wallId);
  const boardPosition = boardWall && distributionBoard ? pointAtOffset(boardWall, distributionBoard.offset) : null;

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
            fill="#13212d"
          />
        ))}
        {walls.map((wall) => (
          <line
            key={wall.id}
            x1={wall.start.x}
            y1={wall.start.y}
            x2={wall.end.x}
            y2={wall.end.y}
            stroke="#f5f7f9"
            strokeWidth={wall.thickness}
            strokeLinecap="square"
          />
        ))}
      </g>

      {cables.map((cable) => {
        const device = devices.find((d) => d.id === cable.deviceId);
        const position = device && devicePosition(device, walls);
        if (!position || !boardPosition) return null;
        const isSelected = selectedCableId === cable.id;
        const dimmed = selectedCableId !== null && !isSelected;
        return (
          <path
            key={cable.id}
            d={`M ${boardPosition.x} ${boardPosition.y} L ${position.x} ${boardPosition.y} L ${position.x} ${position.y}`}
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
        const position = devicePosition(device, walls);
        if (!position) return null;
        const cable = cablesByDeviceId.get(device.id);
        const dimmed = selectedCableId !== null && cable?.id !== selectedCableId;
        return (
          <circle
            key={device.id}
            cx={position.x}
            cy={position.y}
            r={110}
            fill="#0b1520"
            stroke="#9aa7b3"
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
          fill="rgba(104,213,107,0.15)"
          stroke="#68d56b"
          strokeWidth={24}
        />
      )}
    </svg>
  );
}
