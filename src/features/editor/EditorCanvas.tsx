"use client";

import { useMemo, type MouseEvent as ReactMouseEvent } from "react";
import { useEditorStore } from "./store";
import { wallOrientation, pointAtOffset, wallsBoundingBox, polygonCentroid } from "./geometry-utils";
import { formatArea } from "@/lib/utils";

export function EditorCanvas() {
  const walls = useEditorStore((state) => state.walls);
  const rooms = useEditorStore((state) => state.rooms);
  const openings = useEditorStore((state) => state.openings);
  const layers = useEditorStore((state) => state.layers);
  const zoom = useEditorStore((state) => state.zoom);
  const selected = useEditorStore((state) => state.selected);
  const select = useEditorStore((state) => state.select);
  const activeTool = useEditorStore((state) => state.activeTool);

  const box = useMemo(() => wallsBoundingBox(walls), [walls]);
  const vbWidth = box.width / zoom;
  const vbHeight = box.height / zoom;
  const centerX = box.minX + box.width / 2;
  const centerY = box.minY + box.height / 2;
  const viewBox = `${centerX - vbWidth / 2} ${centerY - vbHeight / 2} ${vbWidth} ${vbHeight}`;

  const canSelect = activeTool === "select";

  return (
    <div className="relative h-full w-full overflow-hidden bg-bg-secondary">
      <svg
        viewBox={viewBox}
        className="h-full w-full"
        onClick={() => canSelect && select(null)}
      >
        <defs>
          <pattern id="editor-grid" width={300} height={300} patternUnits="userSpaceOnUse">
            <path d="M 300 0 L 0 0 0 300" fill="none" stroke="#1a2833" strokeWidth={8} />
          </pattern>
        </defs>
        <rect
          x={box.minX - box.width}
          y={box.minY - box.height}
          width={box.width * 3}
          height={box.height * 3}
          fill="url(#editor-grid)"
        />

        {layers.grundriss && (
          <g>
            {rooms.map((room) => {
              const isSelected = selected?.type === "room" && selected.id === room.id;
              return (
                <polygon
                  key={room.id}
                  points={room.polygon.map((p) => `${p.x},${p.y}`).join(" ")}
                  fill={isSelected ? "rgba(22,216,196,0.14)" : "#13212d"}
                  stroke={isSelected ? "#16d8c4" : "transparent"}
                  strokeWidth={isSelected ? 40 : 0}
                  className={canSelect ? "cursor-pointer" : undefined}
                  onClick={(event) => {
                    if (!canSelect) return;
                    event.stopPropagation();
                    select({ type: "room", id: room.id });
                  }}
                />
              );
            })}

            {walls.map((wall) => {
              const isSelected = selected?.type === "wall" && selected.id === wall.id;
              const handleSelect = (event: ReactMouseEvent) => {
                if (!canSelect) return;
                event.stopPropagation();
                select({ type: "wall", id: wall.id });
              };
              return (
                <g key={wall.id}>
                  {/* Visible wall, drawn at true thickness. */}
                  <line
                    x1={wall.start.x}
                    y1={wall.start.y}
                    x2={wall.end.x}
                    y2={wall.end.y}
                    stroke={isSelected ? "#16d8c4" : "#f5f7f9"}
                    strokeWidth={wall.thickness}
                    strokeLinecap="square"
                    pointerEvents="none"
                  />
                  {/* Invisible, generously wide hit-target so thin walls
                      stay easy to click regardless of zoom. */}
                  <line
                    x1={wall.start.x}
                    y1={wall.start.y}
                    x2={wall.end.x}
                    y2={wall.end.y}
                    stroke="transparent"
                    strokeWidth={Math.max(wall.thickness, 500)}
                    strokeLinecap="square"
                    pointerEvents={canSelect ? "stroke" : "none"}
                    className={canSelect ? "cursor-pointer" : undefined}
                    onClick={handleSelect}
                  />
                </g>
              );
            })}

            {openings.map((opening) => {
              const wall = walls.find((w) => w.id === opening.wallId);
              if (!wall) return null;
              const center = pointAtOffset(wall, opening.offset);
              const orientation = wallOrientation(wall);
              const across = wall.thickness + 60;
              const isWindow = opening.type === "window";
              const width = orientation === "h" ? opening.width : across;
              const height = orientation === "h" ? across : opening.width;
              return (
                <rect
                  key={opening.id}
                  x={center.x - width / 2}
                  y={center.y - height / 2}
                  width={width}
                  height={height}
                  fill={isWindow ? "#25b7f2" : "#0b1520"}
                  stroke={isWindow ? "none" : "#9aa7b3"}
                  strokeWidth={isWindow ? 0 : 20}
                />
              );
            })}
          </g>
        )}

        {layers.beschriftung &&
          rooms.map((room) => {
            const centroid = polygonCentroid(room.polygon);
            return (
              <text
                key={room.id}
                x={centroid.x}
                y={centroid.y}
                textAnchor="middle"
                pointerEvents="none"
              >
                <tspan x={centroid.x} dy={-90} fontSize={340} fontWeight={600} fill="#f5f7f9">
                  {room.name}
                </tspan>
                <tspan x={centroid.x} dy={380} fontSize={300} fill="#9aa7b3">
                  {formatArea(room.area)}
                </tspan>
              </text>
            );
          })}
      </svg>
    </div>
  );
}
