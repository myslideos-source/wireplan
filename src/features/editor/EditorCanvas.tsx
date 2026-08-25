"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type DragEvent as ReactDragEvent,
} from "react";
import { Server } from "lucide-react";
import type { ElectricalDevice, Point } from "@/domain";
import {
  findSmartHomeModel,
  numberingPrefixFor,
  formatDeviceNumber,
  DEVICE_TYPE_LABELS,
  fixedConsumerLabel,
} from "@/domain";
import { DRAG_TOOL_MIME } from "./drag-tool";
import { orderTreeBusPoints, type TreeBusPoint } from "@/features/routing/compute-tree-cables";
import { useEditorStore, type EditorTool } from "./store";
import {
  floorExtentBox,
  boundingBoxOfPoints,
  polygonCentroid,
  devicePosition,
  roomZoneColor,
} from "./geometry-utils";
import { formatArea } from "@/lib/utils";
import { DeviceSymbol } from "./DeviceSymbol";
import { SMART_HOME_ICONS } from "./smart-home-icons";

const PLACEABLE_DEVICE_TOOLS: EditorTool[] = ["outlet", "light", "switch", "sensor", "network"];

export function EditorCanvas() {
  const rooms = useEditorStore((state) => state.rooms);
  const devices = useEditorStore((state) => state.devices);
  const layers = useEditorStore((state) => state.layers);
  const zoom = useEditorStore((state) => state.zoom);
  const selected = useEditorStore((state) => state.selected);
  const nudgeSelected = useEditorStore((state) => state.nudgeSelected);
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
  const drawingRoomPoints = useEditorStore((state) => state.drawingRoomPoints);
  const addRoomDrawPoint = useEditorStore((state) => state.addRoomDrawPoint);
  const closeRoomDraw = useEditorStore((state) => state.closeRoomDraw);
  const cancelRoomDraw = useEditorStore((state) => state.cancelRoomDraw);
  const backgroundImage = useEditorStore((state) => state.backgroundImage);
  const backgroundImageOpacity = useEditorStore((state) => state.backgroundImageOpacity);
  const moveBackgroundImageToPoint = useEditorStore((state) => state.moveBackgroundImageToPoint);
  const resizeBackgroundImageToPoint = useEditorStore(
    (state) => state.resizeBackgroundImageToPoint,
  );
  const cropRect = useEditorStore((state) => state.cropRect);
  const updateCropTopLeft = useEditorStore((state) => state.updateCropTopLeft);
  const updateCropBottomRight = useEditorStore((state) => state.updateCropBottomRight);
  const applyCrop = useEditorStore((state) => state.applyCrop);
  const cancelCrop = useEditorStore((state) => state.cancelCrop);
  const leftPanelTab = useEditorStore((state) => state.leftPanelTab);
  const planViewMode = useEditorStore((state) => state.planViewMode);
  const treeBranches = useEditorStore((state) => state.treeBranches);
  const treeJunctions = useEditorStore((state) => state.treeJunctions);
  const addTreeJunctionAtPoint = useEditorStore((state) => state.addTreeJunctionAtPoint);
  const moveTreeJunctionToPoint = useEditorStore((state) => state.moveTreeJunctionToPoint);
  const treeEdges = useEditorStore((state) => state.treeEdges);
  const deleteTreeEdge = useEditorStore((state) => state.deleteTreeEdge);
  const treeConnectPendingNodeRef = useEditorStore((state) => state.treeConnectPendingNodeRef);
  const handleTreeConnectClick = useEditorStore((state) => state.handleTreeConnectClick);
  const cancelTreeConnect = useEditorStore((state) => state.cancelTreeConnect);
  const viewMode = useEditorStore((state) => state.viewMode);
  const fixedConsumers = useEditorStore((state) => state.fixedConsumers);
  const addFixedConsumerAtPoint = useEditorStore((state) => state.addFixedConsumerAtPoint);
  const moveFixedConsumerToPoint = useEditorStore((state) => state.moveFixedConsumerToPoint);
  const multiSelection = useEditorStore((state) => state.multiSelection);
  const toggleMultiSelect = useEditorStore((state) => state.toggleMultiSelect);
  const clearMultiSelection = useEditorStore((state) => state.clearMultiSelection);
  const deleteMultiSelection = useEditorStore((state) => state.deleteMultiSelection);
  const duplicateMultiSelection = useEditorStore((state) => state.duplicateMultiSelection);
  const alignMultiSelection = useEditorStore((state) => state.alignMultiSelection);
  const distributeMultiSelection = useEditorStore((state) => state.distributeMultiSelection);
  const floorId = useEditorStore((state) => state.floorId);

  function isMultiSelected(type: "device" | "smarthome" | "consumer", id: string) {
    return multiSelection.some((s) => s.type === type && s.id === id);
  }

  // §108 — several devices placed at (or very near) the same spot used to
  // be unselectable individually: a click always hit whichever one sat on
  // top. Any click that lands within OVERLAP_EPS_MM of more than one
  // item's position now opens a small picker instead of guessing.
  const OVERLAP_EPS_MM = 40;

  function overlapLabel(item: { kind: "device" | "smarthome" | "consumer"; id: string }): string {
    if (item.kind === "device") {
      const device = devices.find((d) => d.id === item.id);
      if (!device) return "";
      const number = formatDeviceNumber(
        numberingPrefixFor({ type: device.type, networkDeviceSubtype: device.networkDeviceSubtype }),
        device.number,
      );
      return `${DEVICE_TYPE_LABELS[device.type]} ${number}`;
    }
    if (item.kind === "smarthome") {
      const device = smartHomeDevices.find((d) => d.id === item.id);
      const model = device ? findSmartHomeModel(device.modelId) : undefined;
      return model?.label ?? "Smart-Home-Gerät";
    }
    const consumer = fixedConsumers.find((c) => c.id === item.id);
    return consumer ? fixedConsumerLabel(consumer) : "";
  }

  function findOverlapAt(point: Point) {
    const items: { kind: "device" | "smarthome" | "consumer"; id: string; position: Point }[] = [];
    for (const device of devices) {
      const position = devicePosition(device);
      if (Math.hypot(position.x - point.x, position.y - point.y) <= OVERLAP_EPS_MM) {
        items.push({ kind: "device", id: device.id, position });
      }
    }
    for (const device of smartHomeDevices) {
      if (Math.hypot(device.position.x - point.x, device.position.y - point.y) <= OVERLAP_EPS_MM) {
        items.push({ kind: "smarthome", id: device.id, position: device.position });
      }
    }
    for (const consumer of fixedConsumers) {
      if (Math.hypot(consumer.position.x - point.x, consumer.position.y - point.y) <= OVERLAP_EPS_MM) {
        items.push({ kind: "consumer", id: consumer.id, position: consumer.position });
      }
    }
    return items;
  }

  const [overlapPicker, setOverlapPicker] = useState<
    { point: Point; items: { kind: "device" | "smarthome" | "consumer"; id: string; position: Point }[] } | null
  >(null);

  function handleItemClick(
    kind: "device" | "smarthome" | "consumer",
    id: string,
    position: Point,
    event: ReactMouseEvent,
  ) {
    if (event.shiftKey) {
      setOverlapPicker(null);
      toggleMultiSelect({ type: kind, id });
      return;
    }
    const overlap = findOverlapAt(position);
    if (overlap.length > 1) {
      setOverlapPicker({ point: position, items: overlap });
      return;
    }
    setOverlapPicker(null);
    select({ type: kind, id });
  }

  const svgRef = useRef<SVGSVGElement>(null);
  const [dragging, setDragging] = useState<
    | { kind: "board" }
    | { kind: "device"; id: string }
    | { kind: "smarthome"; id: string }
    | { kind: "consumer"; id: string }
    | { kind: "junction"; id: string }
    | { kind: "background" }
    | { kind: "background-resize" }
    | { kind: "crop-tl" }
    | { kind: "crop-br" }
    | {
        kind: "pan";
        startClientX: number;
        startClientY: number;
        startOffsetX: number;
        startOffsetY: number;
        scaleX: number;
        scaleY: number;
      }
    | null
  >(null);
  const [croppingInFlight, setCroppingInFlight] = useState(false);

  // §103 — plain click-drag panning: there was no way to move the view
  // besides zooming, which forced users to zoom in a lot just to get a
  // different part of the plan into view (and made every symbol/label
  // look correspondingly oversized). Offset is component-local view
  // state, not floor data, so it resets on floor switch / focus jumps —
  // adjusted directly during render (React's documented pattern for
  // resetting state on a prop/store change) rather than in an effect,
  // which would cost an extra unnecessary render of the stale offset.
  const [panOffset, setPanOffset] = useState<Point>({ x: 0, y: 0 });
  const justPannedRef = useRef(false);
  const panResetKey = `${floorId ?? ""}|${focusTarget ? `${focusTarget.type}:${focusTarget.id}` : ""}`;
  const [prevPanResetKey, setPrevPanResetKey] = useState(panResetKey);
  if (prevPanResetKey !== panResetKey) {
    setPrevPanResetKey(panResetKey);
    if (panOffset.x !== 0 || panOffset.y !== 0) setPanOffset({ x: 0, y: 0 });
  }

  function handlePanPointerDown(event: ReactPointerEvent) {
    if (!canSelect || dragging) return;
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    setDragging({
      kind: "pan",
      startClientX: event.clientX,
      startClientY: event.clientY,
      startOffsetX: panOffset.x,
      startOffsetY: panOffset.y,
      scaleX: vbWidth / rect.width,
      scaleY: vbHeight / rect.height,
    });
  }

  const box = useMemo(() => {
    if (focusTarget?.type === "room") {
      const room = rooms.find((r) => r.id === focusTarget.id);
      if (room) return boundingBoxOfPoints(room.polygon, 1200);
    }
    return floorExtentBox(rooms, backgroundImage);
  }, [focusTarget, rooms, backgroundImage]);
  const vbWidth = box.width / zoom;
  const vbHeight = box.height / zoom;
  const centerX = box.minX + box.width / 2 + panOffset.x;
  const centerY = box.minY + box.height / 2 + panOffset.y;
  const viewBox = `${centerX - vbWidth / 2} ${centerY - vbHeight / 2} ${vbWidth} ${vbHeight}`;

  const boardPosition = distributionBoard ? distributionBoard.position : null;

  /** One polyline per Tree branch with at least one device — reuses the
   * same nearest-neighbor bus ordering as the actual length calculation
   * (compute-tree-cables.ts) so what's drawn matches what's counted. A
   * branch with any manual edges (§61) is drawn from those edges instead
   * (see `renderedTreeEdges` below) — skipped here to avoid overlapping,
   * conflicting visuals for the same branch. */
  const branchIdsWithManualEdges = useMemo(
    () => new Set(treeEdges.map((edge) => edge.treeBranchId)),
    [treeEdges],
  );
  const treeBusPaths = useMemo(() => {
    if (!boardPosition) return [];
    const paths: { branchId: string; colorHex: string; ordered: TreeBusPoint[] }[] = [];
    for (const branch of treeBranches) {
      if (branchIdsWithManualEdges.has(branch.id)) continue;
      const points: TreeBusPoint[] = [];
      for (const device of devices) {
        if (device.treeBranchId !== branch.id) continue;
        if (!device.smartHomeModelId || !findSmartHomeModel(device.smartHomeModelId)?.countsAsTreeDevice) continue;
        points.push({ id: device.id, position: devicePosition(device) });
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
  }, [treeBranches, devices, smartHomeDevices, boardPosition, branchIdsWithManualEdges]);

  /** §61 — resolves a tagged Tree node ref to a world position for
   * drawing manual edges; mirrors `resolveTreeNodeRef` in store.ts but
   * stays local since the canvas only needs the position, not the branch. */
  function treeNodeRefPosition(ref: string): Point | null {
    if (ref === "board") return boardPosition;
    const separatorIndex = ref.indexOf(":");
    if (separatorIndex === -1) return null;
    const kind = ref.slice(0, separatorIndex);
    const id = ref.slice(separatorIndex + 1);
    if (kind === "device") {
      const device = devices.find((d) => d.id === id);
      return device ? devicePosition(device) : null;
    }
    if (kind === "smarthome") {
      const device = smartHomeDevices.find((d) => d.id === id);
      return device?.position ?? null;
    }
    if (kind === "junction") {
      const junction = treeJunctions.find((j) => j.id === id);
      return junction?.position ?? null;
    }
    return null;
  }

  const renderedTreeEdges = useMemo(() => {
    return treeEdges
      .map((edge) => {
        const branch = treeBranches.find((b) => b.id === edge.treeBranchId);
        const from = treeNodeRefPosition(edge.fromRef);
        const to = treeNodeRefPosition(edge.toRef);
        if (!branch || !from || !to) return null;
        return { id: edge.id, colorHex: branch.colorHex, from, to };
      })
      .filter((e): e is { id: string; colorHex: string; from: Point; to: Point } => e !== null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [treeEdges, treeBranches, devices, smartHomeDevices, treeJunctions, boardPosition]);

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
  const placingJunction = activeTool === "junction";
  const placingRoom = activeTool === "room";
  const placingBackground = activeTool === "background";
  const placingCrop = activeTool === "crop";
  const connectingTree = activeTool === "treeConnect";

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
    function handleMove(event: PointerEvent) {
      // Pan uses a fixed mm-per-client-px scale sampled at drag start
      // instead of toSvgPoint's live CTM — the CTM itself shifts as
      // panOffset updates, which would otherwise distort the drag speed
      // (or feed back on itself) as the gesture progresses.
      if (current.kind === "pan") {
        const dx = (event.clientX - current.startClientX) * current.scaleX;
        const dy = (event.clientY - current.startClientY) * current.scaleY;
        if (Math.abs(event.clientX - current.startClientX) > 3 || Math.abs(event.clientY - current.startClientY) > 3) {
          justPannedRef.current = true;
        }
        setPanOffset({ x: current.startOffsetX - dx, y: current.startOffsetY - dy });
        return;
      }
      const point = toSvgPoint(event);
      if (!point) return;
      if (current.kind === "board") placeDistributionBoard(point);
      else if (current.kind === "device") moveDeviceToPoint(current.id, point);
      else if (current.kind === "smarthome") moveSmartHomeDeviceToPoint(current.id, point);
      else if (current.kind === "consumer") moveFixedConsumerToPoint(current.id, point);
      else if (current.kind === "junction") moveTreeJunctionToPoint(current.id, point);
      else if (current.kind === "background") moveBackgroundImageToPoint(point);
      else if (current.kind === "background-resize") resizeBackgroundImageToPoint(point);
      else if (current.kind === "crop-tl") updateCropTopLeft(point);
      else updateCropBottomRight(point);
    }
    function handleUp() {
      setDragging(null);
    }
    // Pointer events (not mouse events) so dragging a symbol works with
    // touch on a tablet, not just a mouse — pointercancel covers the OS
    // interrupting a touch gesture mid-drag (e.g. an incoming call).
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    window.addEventListener("pointercancel", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      window.removeEventListener("pointercancel", handleUp);
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
    if (toolId === "junction") addTreeJunctionAtPoint(point);
  }

  function handleBackgroundClick(event: ReactMouseEvent) {
    if (justPannedRef.current) {
      justPannedRef.current = false;
      return;
    }
    setOverlapPicker(null);
    if (placingDeviceType || placingSmartHome || placingConsumer || placingJunction) {
      const point = toSvgPoint(event);
      if (point) placeByToolId(activeTool, point);
      return;
    }
    if (placingBoard) {
      const point = toSvgPoint(event);
      if (point) placeDistributionBoard(point);
      return;
    }
    if (placingRoom) {
      const point = toSvgPoint(event);
      if (point) addRoomDrawPoint(point);
      return;
    }
    if (connectingTree) {
      cancelTreeConnect();
      return;
    }
    if (canSelect) {
      select(null);
      clearMultiSelection();
    }
  }

  // Room drawing (§ Phase 11) — Escape discards the in-progress polygon,
  // Enter closes it early (before clicking back near the first vertex).
  useEffect(() => {
    if (!placingRoom) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") cancelRoomDraw();
      else if (event.key === "Enter") closeRoomDraw();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [placingRoom, cancelRoomDraw, closeRoomDraw]);

  useEffect(() => {
    if (!overlapPicker) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOverlapPicker(null);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [overlapPicker]);

  // §110 — arrow keys nudge the selected item by exact mm, bypassing the
  // snap grid, so a symbol can be fine-tuned against an uploaded plan
  // instead of only jumping in 50mm steps. Shift held = 10mm steps.
  useEffect(() => {
    if (!selected) return;
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      const step = event.shiftKey ? 10 : 1;
      let dx = 0;
      let dy = 0;
      if (event.key === "ArrowLeft") dx = -step;
      else if (event.key === "ArrowRight") dx = step;
      else if (event.key === "ArrowUp") dy = -step;
      else if (event.key === "ArrowDown") dy = step;
      else return;
      event.preventDefault();
      nudgeSelected(dx, dy);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selected, nudgeSelected]);

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

  // §8-9 — "Original" shows the uploaded reference plan as-is, full
  // opacity, with no vector overlay; it's a separate view, not a claim
  // that vector devices sit at the exact same pixel coordinates on the
  // raw scan (that requires the locked-background architecture, deferred
  // separately). Honest empty state when nothing's been uploaded yet,
  // rather than silently falling back to the vector rendering.
  if (planViewMode === "original") {
    return (
      <div className="flex h-full w-full items-center justify-center overflow-auto bg-bg-secondary p-6">
        {backgroundImage ? (
          <svg
            viewBox={`0 0 ${backgroundImage.width} ${backgroundImage.height}`}
            className="max-h-full max-w-full shadow-lg"
            style={{ width: backgroundImage.width, height: backgroundImage.height, maxWidth: "100%", maxHeight: "100%" }}
            role="img"
            aria-label="Original-Grundriss"
          >
            <image
              href={backgroundImage.dataUrl}
              x={0}
              y={0}
              width={backgroundImage.width}
              height={backgroundImage.height}
              preserveAspectRatio="xMidYMid meet"
            />
          </svg>
        ) : (
          <div className="flex max-w-sm flex-col items-center gap-2 text-center text-sm text-text-muted">
            <p className="font-medium text-text">Kein Originalplan hochgeladen</p>
            <p>
              Wechseln Sie zu &quot;Planer&quot; und laden Sie über das Werkzeug
              &quot;Hintergrundbild&quot; Ihren Architektenplan hoch.
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className="relative h-full w-full overflow-hidden bg-bg-secondary"
      style={{
        cursor:
          placingDeviceType ||
          placingBoard ||
          placingSmartHome ||
          placingConsumer ||
          placingJunction ||
          placingRoom ||
          connectingTree
            ? "crosshair"
            : placingCrop
              ? "default"
              : canSelect
                ? dragging?.kind === "pan"
                  ? "grabbing"
                  : "grab"
                : undefined,
      }}
    >
      <svg
        ref={svgRef}
        viewBox={viewBox}
        className="h-full w-full touch-none"
        onClick={handleBackgroundClick}
        onPointerDown={handlePanPointerDown}
        onDragOver={handleCanvasDragOver}
        onDrop={handleCanvasDrop}
      >
        <defs>
          <pattern id="editor-grid" width={300} height={300} patternUnits="userSpaceOnUse">
            <path d="M 300 0 L 0 0 0 300" fill="none" stroke="#E5E8E5" strokeWidth={8} />
          </pattern>
        </defs>
        <rect
          x={box.minX - box.width}
          y={box.minY - box.height}
          width={box.width * 3}
          height={box.height * 3}
          fill="url(#editor-grid)"
        />

        {layers.hintergrund && backgroundImage && (
          <g>
            <image
              href={backgroundImage.dataUrl}
              x={backgroundImage.x}
              y={backgroundImage.y}
              width={backgroundImage.width}
              height={backgroundImage.height}
              opacity={backgroundImageOpacity}
              preserveAspectRatio="none"
              style={{ cursor: placingBackground ? "grab" : undefined }}
              pointerEvents={placingBackground ? "auto" : "none"}
              onPointerDown={(event) => {
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
                fill="#27AE60"
                stroke="#F5F8F6"
                strokeWidth={20}
                style={{ cursor: "nwse-resize" }}
                onPointerDown={(event) => {
                  event.stopPropagation();
                  setDragging({ kind: "background-resize" });
                }}
              />
            )}
          </g>
        )}

        {placingCrop && cropRect && backgroundImage && (
          <g pointerEvents="none">
            <path
              fillRule="evenodd"
              fill="rgba(20,16,10,0.55)"
              d={[
                `M ${backgroundImage.x} ${backgroundImage.y}`,
                `H ${backgroundImage.x + backgroundImage.width}`,
                `V ${backgroundImage.y + backgroundImage.height}`,
                `H ${backgroundImage.x} Z`,
                `M ${cropRect.x} ${cropRect.y}`,
                `H ${cropRect.x + cropRect.width}`,
                `V ${cropRect.y + cropRect.height}`,
                `H ${cropRect.x} Z`,
              ].join(" ")}
            />
            <rect
              x={cropRect.x}
              y={cropRect.y}
              width={cropRect.width}
              height={cropRect.height}
              fill="none"
              stroke="#27AE60"
              strokeWidth={20}
              strokeDasharray="60 40"
            />
            <circle
              cx={cropRect.x}
              cy={cropRect.y}
              r={70}
              fill="#27AE60"
              stroke="#F5F8F6"
              strokeWidth={16}
              style={{ cursor: "nwse-resize" }}
              pointerEvents="auto"
              onPointerDown={(event) => {
                event.stopPropagation();
                setDragging({ kind: "crop-tl" });
              }}
            />
            <circle
              cx={cropRect.x + cropRect.width}
              cy={cropRect.y + cropRect.height}
              r={70}
              fill="#27AE60"
              stroke="#F5F8F6"
              strokeWidth={16}
              style={{ cursor: "nwse-resize" }}
              pointerEvents="auto"
              onPointerDown={(event) => {
                event.stopPropagation();
                setDragging({ kind: "crop-br" });
              }}
            />
          </g>
        )}

        {layers.grundriss && (
          <g opacity={dimArchitecture ? 0.25 : 1}>
            {rooms.map((room, index) => {
              const isSelected = selected?.type === "room" && selected.id === room.id;
              // §97 — the Räume tab shows every room in its own persistent
              // zone color (a light "editing mode" overlay); otherwise
              // rooms stay a flat neutral fill and only the selection gets
              // a color highlight.
              const inRoomsTab = leftPanelTab === "raeume";
              return (
                <polygon
                  key={room.id}
                  points={room.polygon.map((p) => `${p.x},${p.y}`).join(" ")}
                  fill={inRoomsTab ? roomZoneColor(index) : isSelected ? "#27AE60" : "#E3EDE6"}
                  fillOpacity={inRoomsTab ? (isSelected ? 0.32 : 0.2) : isSelected ? 0.14 : 1}
                  stroke={isSelected ? "#27AE60" : "transparent"}
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

          </g>
        )}

        {placingRoom && drawingRoomPoints && drawingRoomPoints.length > 0 && (
          <g pointerEvents="none">
            <polyline
              points={drawingRoomPoints.map((p) => `${p.x},${p.y}`).join(" ")}
              fill="none"
              stroke="#27AE60"
              strokeWidth={7}
              strokeDasharray="16 10"
            />
            {drawingRoomPoints.map((p, index) => (
              <circle
                key={index}
                cx={p.x}
                cy={p.y}
                r={index === 0 && drawingRoomPoints.length >= 3 ? 22 : 12}
                fill={index === 0 && drawingRoomPoints.length >= 3 ? "#F5F8F6" : "#27AE60"}
                stroke="#27AE60"
                strokeWidth={index === 0 && drawingRoomPoints.length >= 3 ? 5 : 0}
              />
            ))}
          </g>
        )}

        {layers.elektro && distributionBoard && (() => {
          const center = distributionBoard.position;
          // Rendered as a small fixed-size icon, like every other device
          // symbol — not scaled to the board's real physical footprint
          // (distributionBoard.width/height, a real 60x80cm cabinet). A
          // to-scale rect made this dwarf small rooms regardless of how
          // small its stroke/font got; the real footprint still drives the
          // Technikraum's own cabinet-layout view (CabinetView), which
          // genuinely needs true proportions — this is just the floorplan
          // marker.
          const boxSize = 90;
          const iconSize = 46;
          const isSelected = selected?.type === "board";
          const componentCount = distributionBoard.cabinetComponentModelIds.length;
          return (
            <g
              className={canSelect || connectingTree ? "cursor-pointer" : undefined}
              onClick={(event) => {
                if (!canSelect && !connectingTree) return;
                event.stopPropagation();
                if (connectingTree) {
                  handleTreeConnectClick("board");
                  return;
                }
                select({ type: "board" });
              }}
              onPointerDown={(event) => {
                if (!canSelect) return;
                event.stopPropagation();
                setDragging({ kind: "board" });
              }}
            >
              <rect
                x={center.x - boxSize / 2}
                y={center.y - boxSize / 2}
                width={boxSize}
                height={boxSize}
                rx={10}
                fill="rgba(39,174,96,0.12)"
                stroke="#27AE60"
                strokeWidth={isSelected ? 7 : 5}
              />
              <Server
                x={center.x - iconSize / 2}
                y={center.y - iconSize / 2}
                width={iconSize}
                height={iconSize}
                color="#27AE60"
              />
              <text
                x={center.x}
                y={center.y + boxSize / 2 + 22}
                textAnchor="middle"
                fontSize={26}
                fontWeight={600}
                fill="#27AE60"
                pointerEvents="none"
              >
                {componentCount > 0 ? `Schaltschrank (${componentCount})` : "Schaltschrank"}
              </text>
            </g>
          );
        })()}

        {layers.elektro &&
          devices.map((device) => {
            const position = devicePosition(device);
            const isSelected = selected?.type === "device" && selected.id === device.id;
            return (
              <DeviceSymbol
                key={device.id}
                device={device}
                position={position}
                selected={isSelected}
                clickable={canSelect || connectingTree}
                onSelect={(event) => {
                  if (connectingTree) {
                    handleTreeConnectClick(`device:${device.id}`);
                    return;
                  }
                  handleItemClick("device", device.id, position, event);
                }}
                onDragStart={connectingTree ? undefined : () => setDragging({ kind: "device", id: device.id })}
                dimmed={!isDeviceHighlighted(device)}
                multiSelected={isMultiSelected("device", device.id)}
              />
            );
          })}

        {layers.elektro &&
          smartHomeDevices.map((device) => {
            const isSelected = selected?.type === "smarthome" && selected.id === device.id;
            const model = findSmartHomeModel(device.modelId);
            const color = model?.color ?? "#2D9CDB";
            const Icon = model ? SMART_HOME_ICONS[model.icon] : null;
            return (
              <g
                key={device.id}
                opacity={isSmartHomeHighlighted(device.modelId) ? 1 : 0.25}
                className={canSelect || connectingTree ? "cursor-pointer" : undefined}
                onClick={(event) => {
                  if (!canSelect && !connectingTree) return;
                  event.stopPropagation();
                  if (connectingTree) {
                    handleTreeConnectClick(`smarthome:${device.id}`);
                    return;
                  }
                  handleItemClick("smarthome", device.id, device.position, event);
                }}
                onPointerDown={(event) => {
                  if (!canSelect) return;
                  event.stopPropagation();
                  setDragging({ kind: "smarthome", id: device.id });
                }}
              >
                {isMultiSelected("smarthome", device.id) && (
                  <circle
                    cx={device.position.x}
                    cy={device.position.y}
                    r={57}
                    fill="none"
                    stroke="#27AE60"
                    strokeWidth={4}
                    strokeDasharray="8 5"
                  />
                )}
                <circle
                  cx={device.position.x}
                  cy={device.position.y}
                  r={43}
                  fill={color}
                  fillOpacity={0.18}
                  stroke={isSelected ? "#27AE60" : color}
                  strokeWidth={isSelected ? 9 : 6}
                />
                {Icon ? (
                  <Icon
                    x={device.position.x - 19}
                    y={device.position.y - 19}
                    width={38}
                    height={38}
                    color={isSelected ? "#27AE60" : color}
                  />
                ) : (
                  <circle cx={device.position.x} cy={device.position.y} r={13} fill={color} />
                )}
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
                  handleItemClick("consumer", consumer.id, consumer.position, event);
                }}
                onPointerDown={(event) => {
                  if (!canSelect) return;
                  event.stopPropagation();
                  setDragging({ kind: "consumer", id: consumer.id });
                }}
              >
                {isMultiSelected("consumer", consumer.id) && (
                  <rect
                    x={consumer.position.x - 83}
                    y={consumer.position.y - 83}
                    width={166}
                    height={166}
                    fill="none"
                    stroke="#27AE60"
                    strokeWidth={6}
                    strokeDasharray="13 8"
                  />
                )}
                <rect
                  x={consumer.position.x - 60}
                  y={consumer.position.y - 60}
                  width={120}
                  height={120}
                  fill="rgba(192,57,43,0.15)"
                  stroke={isSelected ? "#27AE60" : "#C0392B"}
                  strokeWidth={isSelected ? 11 : 8}
                />
                <text
                  x={consumer.position.x}
                  y={consumer.position.y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={73}
                  fontWeight={700}
                  fill={isSelected ? "#27AE60" : "#C0392B"}
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

        {layers.kabelwege &&
          (viewMode === "alle" || viewMode === "tree") &&
          renderedTreeEdges.map((edge) => (
            <line
              key={edge.id}
              x1={edge.from.x}
              y1={edge.from.y}
              x2={edge.to.x}
              y2={edge.to.y}
              stroke={edge.colorHex}
              strokeWidth={30}
              strokeLinecap="round"
              opacity={0.85}
              className={connectingTree ? "cursor-pointer" : undefined}
              onClick={(event) => {
                if (!connectingTree) return;
                event.stopPropagation();
                deleteTreeEdge(edge.id);
              }}
            />
          ))}

        {layers.elektro &&
          treeJunctions.map((junction) => {
            const isSelected = selected?.type === "junction" && selected.id === junction.id;
            const ref = `junction:${junction.id}`;
            const isPending = treeConnectPendingNodeRef === ref;
            const branch = treeBranches.find((b) => b.id === junction.treeBranchId);
            return (
              <g
                key={junction.id}
                opacity={viewMode === "alle" || viewMode === "tree" ? 1 : 0.25}
                className={canSelect || connectingTree ? "cursor-pointer" : undefined}
                onClick={(event) => {
                  event.stopPropagation();
                  if (connectingTree) {
                    handleTreeConnectClick(ref);
                    return;
                  }
                  if (!canSelect) return;
                  select({ type: "junction", id: junction.id });
                }}
                onPointerDown={(event) => {
                  if (!canSelect) return;
                  event.stopPropagation();
                  setDragging({ kind: "junction", id: junction.id });
                }}
              >
                <rect
                  x={junction.position.x - 23}
                  y={junction.position.y - 23}
                  width={46}
                  height={46}
                  transform={`rotate(45 ${junction.position.x} ${junction.position.y})`}
                  fill="#FFFFFF"
                  stroke={isPending ? "#27AE60" : (branch?.colorHex ?? "#27AE60")}
                  strokeWidth={isSelected || isPending ? 11 : 6}
                  strokeDasharray={isPending ? "8 5" : undefined}
                />
              </g>
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
                <tspan x={centroid.x} dy={-12} fontSize={56} fontWeight={600} fill="#303030">
                  {room.name}
                </tspan>
                <tspan x={centroid.x} dy={62} fontSize={46} fill="#7F8C8D">
                  {formatArea(room.area)}
                </tspan>
              </text>
            );
          })}

        {overlapPicker && (() => {
          const rowHeight = 50;
          const pickerWidth = 300;
          const padding = 10;
          const height = overlapPicker.items.length * rowHeight + padding * 2;
          const x = overlapPicker.point.x + 40;
          const y = overlapPicker.point.y - height / 2;
          return (
            <g>
              <rect
                x={x}
                y={y}
                width={pickerWidth}
                height={height}
                rx={10}
                fill="#1C2620"
                stroke="#27AE60"
                strokeWidth={3}
              />
              {overlapPicker.items.map((item, index) => {
                const isCurrent = selected?.type === item.kind && selected.id === item.id;
                const rowY = y + padding + index * rowHeight;
                return (
                  <g
                    key={`${item.kind}:${item.id}`}
                    className="cursor-pointer"
                    onClick={(event) => {
                      event.stopPropagation();
                      select({ type: item.kind, id: item.id });
                      setOverlapPicker(null);
                    }}
                  >
                    <rect
                      x={x + 4}
                      y={rowY + 2}
                      width={pickerWidth - 8}
                      height={rowHeight - 4}
                      rx={6}
                      fill={isCurrent ? "rgba(39,174,96,0.3)" : "transparent"}
                    />
                    <text x={x + padding + 8} y={rowY + rowHeight / 2 + 10} fontSize={28} fill="#F5F8F6">
                      {overlapLabel(item)}
                    </text>
                  </g>
                );
              })}
            </g>
          );
        })()}
      </svg>

      {placingCrop && cropRect && (
        <div className="absolute left-1/2 top-4 flex -translate-x-1/2 items-center gap-2 rounded-[var(--radius-md)] border border-border bg-panel px-3 py-2 shadow-lg">
          <span className="px-1 text-xs font-medium text-text-secondary">
            Ecken ziehen, um den Plan zuzuschneiden
          </span>
          <MultiSelectButton label="Abbrechen" onClick={cancelCrop} />
          <MultiSelectButton
            label={croppingInFlight ? "Wird zugeschnitten…" : "Zuschneiden anwenden"}
            onClick={() => {
              if (croppingInFlight) return;
              setCroppingInFlight(true);
              applyCrop().finally(() => setCroppingInFlight(false));
            }}
          />
        </div>
      )}

      {multiSelection.length > 1 && (
        <div className="absolute left-1/2 top-4 flex -translate-x-1/2 items-center gap-1 rounded-[var(--radius-md)] border border-border bg-panel px-2 py-1.5 shadow-lg">
          <span className="px-2 text-xs font-medium text-text-secondary">
            {multiSelection.length} ausgewählt
          </span>
          <MultiSelectButton label="Duplizieren" onClick={duplicateMultiSelection} />
          <MultiSelectButton label="Horizontal ausrichten" onClick={() => alignMultiSelection("horizontal")} />
          <MultiSelectButton label="Vertikal ausrichten" onClick={() => alignMultiSelection("vertical")} />
          <MultiSelectButton
            label="Horizontal verteilen"
            onClick={() => distributeMultiSelection("horizontal")}
          />
          <MultiSelectButton label="Vertikal verteilen" onClick={() => distributeMultiSelection("vertical")} />
          <MultiSelectButton label="Löschen" tone="error" onClick={deleteMultiSelection} />
          <MultiSelectButton label="Abbrechen" onClick={clearMultiSelection} />
        </div>
      )}
    </div>
  );
}

function MultiSelectButton({
  label,
  onClick,
  tone,
}: {
  label: string;
  onClick: () => void;
  tone?: "error";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        tone === "error"
          ? "rounded-[var(--radius-sm)] px-2 py-1 text-xs font-medium text-error transition-colors hover:bg-error/10"
          : "rounded-[var(--radius-sm)] px-2 py-1 text-xs font-medium text-text-secondary transition-colors hover:bg-panel-elevated hover:text-text"
      }
    >
      {label}
    </button>
  );
}
