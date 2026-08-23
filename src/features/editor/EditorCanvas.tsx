"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type DragEvent as ReactDragEvent,
} from "react";
import type { ElectricalDevice, Point } from "@/domain";
import { findSmartHomeModel } from "@/domain";
import { DRAG_TOOL_MIME } from "./drag-tool";
import { orderTreeBusPoints, type TreeBusPoint } from "@/features/routing/compute-tree-cables";
import { useEditorStore, type EditorTool } from "./store";
import {
  wallOrientation,
  pointAtOffset,
  wallsBoundingBox,
  boundingBoxOfPoints,
  polygonCentroid,
  devicePosition,
} from "./geometry-utils";
import { formatArea } from "@/lib/utils";
import { DeviceSymbol } from "./DeviceSymbol";

const PLACEABLE_DEVICE_TOOLS: EditorTool[] = ["outlet", "light", "switch", "sensor", "network"];

export function EditorCanvas() {
  const walls = useEditorStore((state) => state.walls);
  const rooms = useEditorStore((state) => state.rooms);
  const openings = useEditorStore((state) => state.openings);
  const devices = useEditorStore((state) => state.devices);
  const layers = useEditorStore((state) => state.layers);
  const zoom = useEditorStore((state) => state.zoom);
  const selected = useEditorStore((state) => state.selected);
  const select = useEditorStore((state) => state.select);
  const activeTool = useEditorStore((state) => state.activeTool);
  const focusTarget = useEditorStore((state) => state.focusTarget);
  const addDeviceAtPoint = useEditorStore((state) => state.addDeviceAtPoint);
  const spotArrayCount = useEditorStore((state) => state.spotArrayCount);
  const addSpotArrayAtPoint = useEditorStore((state) => state.addSpotArrayAtPoint);
  const distributionBoard = useEditorStore((state) => state.distributionBoard);
  const placeDistributionBoard = useEditorStore((state) => state.placeDistributionBoard);
  const smartHomeDevices = useEditorStore((state) => state.smartHomeDevices);
  const addSmartHomeDeviceAtPoint = useEditorStore((state) => state.addSmartHomeDeviceAtPoint);
  const moveDeviceToPoint = useEditorStore((state) => state.moveDeviceToPoint);
  const moveSmartHomeDeviceToPoint = useEditorStore((state) => state.moveSmartHomeDeviceToPoint);
  const addOpeningAtPoint = useEditorStore((state) => state.addOpeningAtPoint);
  const moveOpeningToPoint = useEditorStore((state) => state.moveOpeningToPoint);
  const backgroundImage = useEditorStore((state) => state.backgroundImage);
  const moveBackgroundImageToPoint = useEditorStore((state) => state.moveBackgroundImageToPoint);
  const resizeBackgroundImageToPoint = useEditorStore(
    (state) => state.resizeBackgroundImageToPoint,
  );
  const treeBranches = useEditorStore((state) => state.treeBranches);
  const viewMode = useEditorStore((state) => state.viewMode);
  const fixedConsumers = useEditorStore((state) => state.fixedConsumers);
  const addFixedConsumerAtPoint = useEditorStore((state) => state.addFixedConsumerAtPoint);
  const moveFixedConsumerToPoint = useEditorStore((state) => state.moveFixedConsumerToPoint);

  const svgRef = useRef<SVGSVGElement>(null);
  const [dragging, setDragging] = useState<
    | { kind: "board" }
    | { kind: "device"; id: string }
    | { kind: "smarthome"; id: string }
    | { kind: "opening"; id: string }
    | { kind: "consumer"; id: string }
    | { kind: "background" }
    | { kind: "background-resize" }
    | null
  >(null);

  const box = useMemo(() => {
    if (focusTarget?.type === "room") {
      const room = rooms.find((r) => r.id === focusTarget.id);
      if (room) return boundingBoxOfPoints(room.polygon, 1200);
    }
    if (focusTarget?.type === "wall") {
      const wall = walls.find((w) => w.id === focusTarget.id);
      if (wall) return boundingBoxOfPoints([wall.start, wall.end], 1500);
    }
    if (focusTarget?.type === "opening") {
      const opening = openings.find((o) => o.id === focusTarget.id);
      const wall = opening && walls.find((w) => w.id === opening.wallId);
      if (opening && wall) {
        return boundingBoxOfPoints([pointAtOffset(wall, opening.offset)], 1800);
      }
    }
    return wallsBoundingBox(walls);
  }, [focusTarget, rooms, walls, openings]);
  const vbWidth = box.width / zoom;
  const vbHeight = box.height / zoom;
  const centerX = box.minX + box.width / 2;
  const centerY = box.minY + box.height / 2;
  const viewBox = `${centerX - vbWidth / 2} ${centerY - vbHeight / 2} ${vbWidth} ${vbHeight}`;

  const boardWall = distributionBoard ? walls.find((w) => w.id === distributionBoard.wallId) : undefined;
  const boardPosition =
    boardWall && distributionBoard ? pointAtOffset(boardWall, distributionBoard.offset) : null;

  /** One polyline per Tree branch with at least one device — reuses the
   * same nearest-neighbor bus ordering as the actual length calculation
   * (compute-tree-cables.ts) so what's drawn matches what's counted. */
  const treeBusPaths = useMemo(() => {
    if (!boardPosition) return [];
    const paths: { branchId: string; colorHex: string; ordered: TreeBusPoint[] }[] = [];
    for (const branch of treeBranches) {
      const points: TreeBusPoint[] = [];
      for (const device of devices) {
        if (device.treeBranchId !== branch.id) continue;
        if (!device.smartHomeModelId || !findSmartHomeModel(device.smartHomeModelId)?.countsAsTreeDevice) continue;
        const position = devicePosition(device, walls);
        if (position) points.push({ id: device.id, position });
      }
      for (const device of smartHomeDevices) {
        if (device.treeBranchId !== branch.id) continue;
        if (!findSmartHomeModel(device.modelId)?.countsAsTreeDevice) continue;
        points.push({ id: device.id, position: device.position });
      }
      if (points.length === 0) continue;
      paths.push({ branchId: branch.id, colorHex: branch.colorHex, ordered: orderTreeBusPoints(boardPosition, points) });
    }
    return paths;
  }, [treeBranches, devices, smartHomeDevices, walls, boardPosition]);

  function isTreeDevice(device: ElectricalDevice): boolean {
    return !!device.smartHomeModelId && !!findSmartHomeModel(device.smartHomeModelId)?.countsAsTreeDevice;
  }

  // §66-71 — each focused view highlights one concern and dims the rest;
  // "alle" highlights everything (nothing dimmed).
  const dimArchitecture = viewMode !== "alle";
  function isDeviceHighlighted(device: ElectricalDevice): boolean {
    if (viewMode === "alle") return true;
    if (viewMode === "tree") return isTreeDevice(device);
    if (viewMode === "network") return device.type === "network";
    if (viewMode === "power") return device.type === "outlet";
    return false;
  }
  function isSmartHomeHighlighted(modelId: string): boolean {
    const model = findSmartHomeModel(modelId);
    if (viewMode === "alle") return true;
    if (viewMode === "tree") return !!model?.countsAsTreeDevice;
    if (viewMode === "audio") return model?.technology === "audio";
    return false;
  }
  const consumerHighlighted = viewMode === "alle" || viewMode === "power";

  const canSelect = activeTool === "select";
  const placingDeviceType = PLACEABLE_DEVICE_TOOLS.includes(activeTool)
    ? (activeTool as ElectricalDevice["type"])
    : null;
  const placingBoard = activeTool === "board";
  const placingSmartHome = activeTool === "smarthome";
  const placingConsumer = activeTool === "consumer";
  const placingOpeningType = activeTool === "door" ? "door" : activeTool === "window" ? "window" : null;
  const placingBackground = activeTool === "background";

  function toSvgPoint(event: { clientX: number; clientY: number }) {
    const svg = svgRef.current;
    if (!svg) return null;
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    const transformed = point.matrixTransform(ctm.inverse());
    return { x: transformed.x, y: transformed.y };
  }

  useEffect(() => {
    if (!dragging) return;
    const current = dragging;
    function handleMove(event: MouseEvent) {
      const point = toSvgPoint(event);
      if (!point) return;
      if (current.kind === "board") placeDistributionBoard(point);
      else if (current.kind === "device") moveDeviceToPoint(current.id, point);
      else if (current.kind === "smarthome") moveSmartHomeDeviceToPoint(current.id, point);
      else if (current.kind === "opening") moveOpeningToPoint(current.id, point);
      else if (current.kind === "consumer") moveFixedConsumerToPoint(current.id, point);
      else if (current.kind === "background") moveBackgroundImageToPoint(point);
      else resizeBackgroundImageToPoint(point);
    }
    function handleUp() {
      setDragging(null);
    }
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragging]);

  /** Places whatever a device/smart-home tool id refers to at a point —
   * shared by click-to-place (armed via the toolbar) and drag-and-drop
   * (armed implicitly by what was dragged), so there's exactly one place
   * that turns a tool id into a device. */
  function placeByToolId(toolId: string, point: Point) {
    if (toolId === "light" && spotArrayCount > 1) {
      addSpotArrayAtPoint(point);
      return;
    }
    if (PLACEABLE_DEVICE_TOOLS.includes(toolId as EditorTool)) {
      addDeviceAtPoint(toolId as ElectricalDevice["type"], point);
      return;
    }
    if (toolId === "smarthome") {
      addSmartHomeDeviceAtPoint(point);
      return;
    }
    if (toolId === "consumer") addFixedConsumerAtPoint(point);
  }

  function handleBackgroundClick(event: ReactMouseEvent) {
    if (placingDeviceType || placingSmartHome || placingConsumer) {
      const point = toSvgPoint(event);
      if (point) placeByToolId(activeTool, point);
      return;
    }
    if (placingBoard) {
      const point = toSvgPoint(event);
      if (point) placeDistributionBoard(point);
      return;
    }
    if (placingOpeningType) {
      const point = toSvgPoint(event);
      if (point) addOpeningAtPoint(placingOpeningType, point);
      return;
    }
    if (canSelect) select(null);
  }

  function handleCanvasDragOver(event: ReactDragEvent) {
    if (event.dataTransfer.types.includes(DRAG_TOOL_MIME)) event.preventDefault();
  }

  function handleCanvasDrop(event: ReactDragEvent) {
    const toolId = event.dataTransfer.getData(DRAG_TOOL_MIME);
    if (!toolId) return;
    event.preventDefault();
    const point = toSvgPoint(event);
    if (point) placeByToolId(toolId, point);
  }

  return (
    <div
      className="relative h-full w-full overflow-hidden bg-bg-secondary"
      style={{
        cursor:
          placingDeviceType || placingBoard || placingSmartHome || placingConsumer || placingOpeningType
            ? "crosshair"
            : undefined,
      }}
    >
      <svg
        ref={svgRef}
        viewBox={viewBox}
        className="h-full w-full"
        onClick={handleBackgroundClick}
        onDragOver={handleCanvasDragOver}
        onDrop={handleCanvasDrop}
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
          <g opacity={dimArchitecture ? 0.25 : 1}>
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
              const isFocused = focusTarget?.type === "opening" && focusTarget.id === opening.id;
              const isSelected = selected?.type === "opening" && selected.id === opening.id;
              return (
                <g
                  key={opening.id}
                  className={canSelect ? "cursor-grab" : undefined}
                  onClick={(event) => {
                    if (!canSelect) return;
                    event.stopPropagation();
                    select({ type: "opening", id: opening.id });
                  }}
                  onMouseDown={(event) => {
                    if (!canSelect) return;
                    event.stopPropagation();
                    setDragging({ kind: "opening", id: opening.id });
                  }}
                >
                  <rect
                    x={center.x - width / 2}
                    y={center.y - height / 2}
                    width={width}
                    height={height}
                    fill={isWindow ? "#25b7f2" : "#0b1520"}
                    stroke={isSelected ? "#16d8c4" : isWindow ? "none" : "#9aa7b3"}
                    strokeWidth={isSelected ? 30 : isWindow ? 0 : 20}
                  />
                  {isFocused && (
                    <circle
                      cx={center.x}
                      cy={center.y}
                      r={Math.max(width, height) * 0.9}
                      fill="none"
                      stroke="#16d8c4"
                      strokeWidth={30}
                      strokeDasharray="60 40"
                    />
                  )}
                </g>
              );
            })}
          </g>
        )}

        {layers.elektro && distributionBoard && (() => {
          const wall = walls.find((w) => w.id === distributionBoard.wallId);
          if (!wall) return null;
          const center = pointAtOffset(wall, distributionBoard.offset);
          const orientation = wallOrientation(wall);
          const depth = 250;
          const width = orientation === "h" ? distributionBoard.width : depth;
          const height = orientation === "h" ? depth : distributionBoard.width;
          const isSelected = selected?.type === "board";
          return (
            <g
              className={canSelect ? "cursor-grab" : undefined}
              onClick={(event) => {
                if (!canSelect) return;
                event.stopPropagation();
                select({ type: "board" });
              }}
              onMouseDown={(event) => {
                if (!canSelect) return;
                event.stopPropagation();
                setDragging({ kind: "board" });
              }}
            >
              <rect
                x={center.x - width / 2}
                y={center.y - height / 2}
                width={width}
                height={height}
                fill="rgba(104,213,107,0.12)"
                stroke={isSelected ? "#16d8c4" : "#68d56b"}
                strokeWidth={isSelected ? 36 : 24}
              />
              <text x={center.x} y={center.y} textAnchor="middle" pointerEvents="none">
                <tspan x={center.x} dy={-60} fontSize={230} fontWeight={600} fill="#68d56b">
                  Verteiler / Schaltschrank
                </tspan>
                <tspan x={center.x} dy={280} fontSize={200} fill="#9aa7b3">
                  Loxone Miniserver
                </tspan>
              </text>
            </g>
          );
        })()}

        {layers.elektro &&
          devices.map((device) => {
            const position = devicePosition(device, walls);
            if (!position) return null;
            const isSelected = selected?.type === "device" && selected.id === device.id;
            return (
              <DeviceSymbol
                key={device.id}
                device={device}
                position={position}
                selected={isSelected}
                clickable={canSelect}
                onSelect={() => select({ type: "device", id: device.id })}
                onDragStart={() => setDragging({ kind: "device", id: device.id })}
                dimmed={!isDeviceHighlighted(device)}
              />
            );
          })}

        {layers.elektro &&
          smartHomeDevices.map((device) => {
            const isSelected = selected?.type === "smarthome" && selected.id === device.id;
            return (
              <g
                key={device.id}
                opacity={isSmartHomeHighlighted(device.modelId) ? 1 : 0.25}
                className={canSelect ? "cursor-grab" : undefined}
                onClick={(event) => {
                  if (!canSelect) return;
                  event.stopPropagation();
                  select({ type: "smarthome", id: device.id });
                }}
                onMouseDown={(event) => {
                  if (!canSelect) return;
                  event.stopPropagation();
                  setDragging({ kind: "smarthome", id: device.id });
                }}
              >
                <circle
                  cx={device.position.x}
                  cy={device.position.y}
                  r={160}
                  fill="rgba(37,183,242,0.18)"
                  stroke={isSelected ? "#16d8c4" : "#25b7f2"}
                  strokeWidth={isSelected ? 36 : 24}
                />
                <circle cx={device.position.x} cy={device.position.y} r={50} fill="#25b7f2" />
              </g>
            );
          })}

        {layers.elektro &&
          fixedConsumers.map((consumer) => {
            const isSelected = selected?.type === "consumer" && selected.id === consumer.id;
            return (
              <g
                key={consumer.id}
                opacity={consumerHighlighted ? 1 : 0.25}
                className={canSelect ? "cursor-grab" : undefined}
                onClick={(event) => {
                  if (!canSelect) return;
                  event.stopPropagation();
                  select({ type: "consumer", id: consumer.id });
                }}
                onMouseDown={(event) => {
                  if (!canSelect) return;
                  event.stopPropagation();
                  setDragging({ kind: "consumer", id: consumer.id });
                }}
              >
                <rect
                  x={consumer.position.x - 150}
                  y={consumer.position.y - 150}
                  width={300}
                  height={300}
                  fill="rgba(242,96,96,0.15)"
                  stroke={isSelected ? "#16d8c4" : "#f26060"}
                  strokeWidth={isSelected ? 30 : 20}
                />
                <text
                  x={consumer.position.x}
                  y={consumer.position.y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={180}
                  fontWeight={700}
                  fill={isSelected ? "#16d8c4" : "#f26060"}
                  pointerEvents="none"
                >
                  V
                </text>
              </g>
            );
          })}

        {layers.kabelwege &&
          (viewMode === "alle" || viewMode === "tree") &&
          treeBusPaths.map(({ branchId, colorHex, ordered }) => {
            const start = boardPosition!;
            const pathD = [`M ${start.x} ${start.y}`, ...ordered.map((p) => `L ${p.position.x} ${p.position.y}`)].join(" ");
            return (
              <path
                key={branchId}
                d={pathD}
                fill="none"
                stroke={colorHex}
                strokeWidth={30}
                strokeLinejoin="round"
                opacity={0.85}
              />
            );
          })}

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
                opacity={dimArchitecture ? 0.25 : 1}
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

        {layers.hintergrund && backgroundImage && (
          <g>
            <image
              href={backgroundImage.dataUrl}
              x={backgroundImage.x}
              y={backgroundImage.y}
              width={backgroundImage.width}
              height={backgroundImage.height}
              opacity={0.55}
              preserveAspectRatio="none"
              style={{ cursor: placingBackground ? "grab" : undefined }}
              pointerEvents={placingBackground ? "auto" : "none"}
              onMouseDown={(event) => {
                if (!placingBackground) return;
                event.stopPropagation();
                setDragging({ kind: "background" });
              }}
            />
            {placingBackground && (
              <rect
                x={backgroundImage.x + backgroundImage.width - 120}
                y={backgroundImage.y + backgroundImage.height - 120}
                width={240}
                height={240}
                fill="#16d8c4"
                stroke="#071019"
                strokeWidth={20}
                style={{ cursor: "nwse-resize" }}
                onMouseDown={(event) => {
                  event.stopPropagation();
                  setDragging({ kind: "background-resize" });
                }}
              />
            )}
          </g>
        )}
      </svg>
    </div>
  );
}
