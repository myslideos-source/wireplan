"use client";

import { create } from "zustand";
import type {
  Wall,
  Room,
  Opening,
  Point,
  ElectricalDevice,
  ElectricalDeviceType,
  DistributionBoard,
  Cable,
  RoutingMode,
  SmartHomeDevice,
} from "@/domain";
import {
  polygonAreaSqMeters,
  DEVICE_MOUNT_KIND,
  DEVICE_DEFAULT_HEIGHT,
  LOXONE_SYSTEM,
  LOXONE_CATALOG,
} from "@/domain";
import type { FloorGeometry } from "./mock-geometry";
import type { FlaggedArea, FlaggedAreaTarget } from "@/features/plan-analysis/types";
import { computeCables } from "@/features/routing/compute-cables";
import {
  isAxisAlignedRectangle,
  splitRectangle,
  tryMergeAdjacentRects,
  wallMatchesSegment,
  findNearestWall,
  closestPointOnWall,
  isPointInPolygon,
  pointAtOffset,
  wallNormal,
  roomWalls,
  type SplitDirection,
} from "./geometry-utils";

export type EditorTool =
  | "select"
  | "wall"
  | "room"
  | "outlet"
  | "light"
  | "switch"
  | "sensor"
  | "network"
  | "board"
  | "smarthome"
  | "cable";

export type LayerId = "grundriss" | "elektro" | "kabelwege" | "beschriftung";

export type Selection =
  | { type: "room"; id: string }
  | { type: "wall"; id: string }
  | { type: "device"; id: string }
  | { type: "board" }
  | { type: "smarthome"; id: string }
  | null;

export const DISTRIBUTION_BOARD_ID = "distribution-board";

let nextGeneratedId = 1;
function generateId(prefix: string): string {
  return `${prefix}-gen-${nextGeneratedId++}`;
}

function selectionFromTarget(target: FlaggedAreaTarget | undefined): Selection {
  if (target?.type === "room") return { type: "room", id: target.id };
  if (target?.type === "wall") return { type: "wall", id: target.id };
  return null;
}

/** Everything that's per-floor and independently editable — each floor
 * has its own geometry, devices, Technikraum/Schaltschrank, and cables,
 * so switching floors swaps this whole slice rather than resetting it. */
interface FloorMutableSlice {
  walls: Wall[];
  rooms: Room[];
  openings: Opening[];
  devices: ElectricalDevice[];
  roomCircuits: Record<string, string | null>;
  technikraumRoomId: string | null;
  distributionBoard: DistributionBoard | null;
  cables: Cable[];
  smartHomeDevices: SmartHomeDevice[];
}

function freshSliceFromGeometry(geometry: FloorGeometry): FloorMutableSlice {
  return {
    walls: geometry.walls,
    rooms: geometry.rooms,
    openings: geometry.openings,
    devices: [],
    roomCircuits: {},
    technikraumRoomId: null,
    distributionBoard: null,
    cables: [],
    smartHomeDevices: [],
  };
}

interface EditorState {
  floorId: string | null;
  floors: FloorGeometry[];
  floorCache: Record<string, FloorMutableSlice>;
  walls: Wall[];
  rooms: Room[];
  openings: Opening[];
  devices: ElectricalDevice[];
  roomCircuits: Record<string, string | null>;
  technikraumRoomId: string | null;
  distributionBoard: DistributionBoard | null;
  cables: Cable[];
  routingMode: RoutingMode;
  smartHomeDevices: SmartHomeDevice[];
  smartHomePlacementModelId: string;
  hydrate: (geometries: FloorGeometry[]) => void;
  switchFloor: (floorId: string) => void;

  selected: Selection;
  select: (selection: Selection) => void;

  activeTool: EditorTool;
  setTool: (tool: EditorTool) => void;

  layers: Record<LayerId, boolean>;
  toggleLayer: (layer: LayerId) => void;

  zoom: number;
  setZoom: (updater: number | ((zoom: number) => number)) => void;

  updateRoom: (id: string, patch: Partial<Pick<Room, "name" | "type" | "height">>) => void;
  updateWallThickness: (id: string, thicknessMm: number) => void;
  deleteOpening: (id: string) => void;
  addDeviceAtPoint: (type: ElectricalDeviceType, point: Point) => boolean;
  moveDeviceToPoint: (deviceId: string, point: Point) => void;
  deleteDevice: (id: string) => void;
  assignDeviceSmartHomeModel: (deviceId: string, modelId: string | null) => void;
  assignBoardSmartHomeModel: (modelId: string | null) => void;
  setSmartHomePlacementModelId: (modelId: string) => void;
  addSmartHomeDeviceAtPoint: (point: Point) => boolean;
  moveSmartHomeDeviceToPoint: (deviceId: string, point: Point) => void;
  deleteSmartHomeDevice: (id: string) => void;
  setSmartHomeDeviceModel: (deviceId: string, modelId: string) => void;
  setRoomCircuit: (roomId: string, circuitId: string | null) => void;
  setTechnikraum: (roomId: string) => void;
  placeDistributionBoard: (point: Point) => boolean;
  deleteDistributionBoard: () => void;
  setRoutingMode: (mode: RoutingMode) => void;
  calculateRouting: () => boolean;
  splitRoom: (
    roomId: string,
    direction: SplitDirection,
    ratio: number,
    nameA: string,
    nameB: string,
  ) => boolean;
  mergeRooms: (roomIdA: string, roomIdB: string, newName: string) => boolean;

  // Guided Review Mode (§17-18) — walks through the AI analysis's flagged
  // areas one at a time, focusing the canvas on each and offering the
  // matching correction tool.
  reviewActive: boolean;
  reviewQueue: FlaggedArea[];
  reviewIndex: number;
  focusTarget: FlaggedAreaTarget | null;
  startReview: (areas: FlaggedArea[]) => void;
  goToProblem: (index: number) => void;
  nextProblem: () => void;
  exitReview: () => void;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  floorId: null,
  floors: [],
  floorCache: {},
  walls: [],
  rooms: [],
  openings: [],
  devices: [],
  roomCircuits: {},
  technikraumRoomId: null,
  distributionBoard: null,
  cables: [],
  routingMode: "Decke",
  smartHomeDevices: [],
  smartHomePlacementModelId: LOXONE_CATALOG[0].id,
  hydrate: (geometries) => {
    // Re-hydrate whenever a different project's floors are passed in (e.g.
    // navigating from one project's editor to another's without a full
    // page reload) but skip redundant resets of in-progress edits.
    const first = geometries[0];
    if (!first) return;
    if (get().floors[0]?.floor.projectId === first.floor.projectId) return;
    set({
      floors: geometries,
      floorCache: {},
      floorId: first.floor.id,
      ...freshSliceFromGeometry(first),
      selected: null,
    });
  },

  switchFloor: (floorId) => {
    const state = get();
    if (state.floorId === floorId) return;
    const currentFloorId = state.floorId;
    const currentSlice: FloorMutableSlice = {
      walls: state.walls,
      rooms: state.rooms,
      openings: state.openings,
      devices: state.devices,
      roomCircuits: state.roomCircuits,
      technikraumRoomId: state.technikraumRoomId,
      distributionBoard: state.distributionBoard,
      cables: state.cables,
      smartHomeDevices: state.smartHomeDevices,
    };
    const newCache = currentFloorId
      ? { ...state.floorCache, [currentFloorId]: currentSlice }
      : state.floorCache;

    const target = state.floors.find((f) => f.floor.id === floorId);
    if (!target) return;
    const slice = newCache[floorId] ?? freshSliceFromGeometry(target);

    set({
      floorCache: newCache,
      floorId,
      ...slice,
      selected: null,
      activeTool: "select",
    });
  },

  selected: null,
  select: (selection) => set({ selected: selection }),

  activeTool: "select",
  setTool: (tool) => set({ activeTool: tool }),

  layers: { grundriss: true, elektro: true, kabelwege: true, beschriftung: true },
  toggleLayer: (layer) =>
    set((state) => ({ layers: { ...state.layers, [layer]: !state.layers[layer] } })),

  zoom: 1,
  setZoom: (updater) =>
    set((state) => ({
      zoom: Math.min(
        3,
        Math.max(
          0.4,
          typeof updater === "function" ? updater(state.zoom) : updater,
        ),
      ),
    })),

  updateRoom: (id, patch) =>
    set((state) => ({
      rooms: state.rooms.map((room) =>
        room.id === id ? { ...room, ...patch } : room,
      ),
    })),

  updateWallThickness: (id, thicknessMm) =>
    set((state) => ({
      walls: state.walls.map((wall) =>
        wall.id === id ? { ...wall, thickness: thicknessMm } : wall,
      ),
    })),

  deleteOpening: (id) =>
    set((state) => ({
      openings: state.openings.filter((opening) => opening.id !== id),
    })),

  addDeviceAtPoint: (type, point) => {
    const state = get();
    const mountKind = DEVICE_MOUNT_KIND[type];
    const height = DEVICE_DEFAULT_HEIGHT[type];

    if (mountKind === "wall") {
      const wall = findNearestWall(state.walls, point);
      if (!wall) return false;
      const { offset } = closestPointOnWall(wall, point);

      // A wall-mounted device sits right on the wall's thickness, so the
      // raw click can land just outside every room polygon (which are
      // drawn to wall centerlines). Probe both perpendicular sides of the
      // wall instead of trusting the exact click point.
      const wallPoint = pointAtOffset(wall, offset);
      const normal = wallNormal(wall);
      const probeDistance = 150;
      const sideA = { x: wallPoint.x + normal.x * probeDistance, y: wallPoint.y + normal.y * probeDistance };
      const sideB = { x: wallPoint.x - normal.x * probeDistance, y: wallPoint.y - normal.y * probeDistance };
      const room =
        state.rooms.find((r) => isPointInPolygon(sideA, r.polygon)) ??
        state.rooms.find((r) => isPointInPolygon(sideB, r.polygon));

      const device: ElectricalDevice = {
        id: generateId("device"),
        floorId: state.floorId ?? "",
        type,
        mount: { kind: "wall", wallId: wall.id, offset, height },
        roomId: room?.id ?? null,
      };
      set((s) => ({ devices: [...s.devices, device] }));
      return true;
    }

    const room = state.rooms.find((r) => isPointInPolygon(point, r.polygon));
    if (!room) return false;
    const device: ElectricalDevice = {
      id: generateId("device"),
      floorId: state.floorId ?? "",
      type,
      mount: { kind: "point", position: point, height },
      roomId: room.id,
    };
    set((s) => ({ devices: [...s.devices, device] }));
    return true;
  },

  moveDeviceToPoint: (deviceId, point) => {
    const state = get();
    const device = state.devices.find((d) => d.id === deviceId);
    if (!device) return;

    if (device.mount.kind === "wall") {
      const wall = findNearestWall(state.walls, point);
      if (!wall) return;
      const { offset } = closestPointOnWall(wall, point);
      const wallPoint = pointAtOffset(wall, offset);
      const normal = wallNormal(wall);
      const probeDistance = 150;
      const sideA = { x: wallPoint.x + normal.x * probeDistance, y: wallPoint.y + normal.y * probeDistance };
      const sideB = { x: wallPoint.x - normal.x * probeDistance, y: wallPoint.y - normal.y * probeDistance };
      const room =
        state.rooms.find((r) => isPointInPolygon(sideA, r.polygon)) ??
        state.rooms.find((r) => isPointInPolygon(sideB, r.polygon));
      set((s) => ({
        devices: s.devices.map((d) =>
          d.id === deviceId
            ? {
                ...d,
                mount: { kind: "wall", wallId: wall.id, offset, height: device.mount.height },
                roomId: room?.id ?? null,
              }
            : d,
        ),
      }));
      return;
    }

    const room = state.rooms.find((r) => isPointInPolygon(point, r.polygon));
    set((s) => ({
      devices: s.devices.map((d) =>
        d.id === deviceId
          ? {
              ...d,
              mount: { kind: "point", position: point, height: device.mount.height },
              roomId: room?.id ?? null,
            }
          : d,
      ),
    }));
  },

  deleteDevice: (id) =>
    set((state) => ({
      devices: state.devices.filter((device) => device.id !== id),
      selected: state.selected?.type === "device" && state.selected.id === id
        ? null
        : state.selected,
    })),

  setRoomCircuit: (roomId, circuitId) =>
    set((state) => ({
      roomCircuits: { ...state.roomCircuits, [roomId]: circuitId },
    })),

  assignDeviceSmartHomeModel: (deviceId, modelId) =>
    set((state) => ({
      devices: state.devices.map((device) =>
        device.id === deviceId
          ? { ...device, smartHomeModelId: modelId ?? undefined }
          : device,
      ),
    })),

  assignBoardSmartHomeModel: (modelId) =>
    set((state) =>
      state.distributionBoard
        ? {
            distributionBoard: {
              ...state.distributionBoard,
              smartHomeModelId: modelId ?? undefined,
            },
          }
        : {},
    ),

  setSmartHomePlacementModelId: (modelId) => set({ smartHomePlacementModelId: modelId }),

  addSmartHomeDeviceAtPoint: (point) => {
    const state = get();
    const room = state.rooms.find((r) => isPointInPolygon(point, r.polygon));
    const device: SmartHomeDevice = {
      id: generateId("smarthome"),
      floorId: state.floorId ?? "",
      systemId: LOXONE_SYSTEM.id,
      modelId: state.smartHomePlacementModelId,
      position: point,
      roomId: room?.id ?? null,
    };
    set((s) => ({ smartHomeDevices: [...s.smartHomeDevices, device] }));
    return true;
  },

  moveSmartHomeDeviceToPoint: (deviceId, point) => {
    const state = get();
    const room = state.rooms.find((r) => isPointInPolygon(point, r.polygon));
    set((s) => ({
      smartHomeDevices: s.smartHomeDevices.map((device) =>
        device.id === deviceId
          ? { ...device, position: point, roomId: room?.id ?? null }
          : device,
      ),
    }));
  },

  deleteSmartHomeDevice: (id) =>
    set((state) => ({
      smartHomeDevices: state.smartHomeDevices.filter((device) => device.id !== id),
      selected: state.selected?.type === "smarthome" && state.selected.id === id
        ? null
        : state.selected,
    })),

  setSmartHomeDeviceModel: (deviceId, modelId) =>
    set((state) => ({
      smartHomeDevices: state.smartHomeDevices.map((device) =>
        device.id === deviceId ? { ...device, modelId } : device,
      ),
    })),

  setTechnikraum: (roomId) => set({ technikraumRoomId: roomId }),

  placeDistributionBoard: (point) => {
    const state = get();
    const technikraum = state.rooms.find((r) => r.id === state.technikraumRoomId);
    if (!technikraum) return false;

    // Restrict placement to walls that actually border the Technikraum
    // (§45) rather than any wall on the floor.
    const candidateWalls = roomWalls(state.walls, technikraum);
    const wall = findNearestWall(candidateWalls, point);
    if (!wall) return false;
    const { offset } = closestPointOnWall(wall, point);

    const board: DistributionBoard = {
      id: DISTRIBUTION_BOARD_ID,
      floorId: state.floorId ?? "",
      roomId: technikraum.id,
      wallId: wall.id,
      offset,
      width: 600,
      height: 800,
    };
    set({ distributionBoard: board, cables: [] });
    return true;
  },

  deleteDistributionBoard: () =>
    set((state) => ({
      distributionBoard: null,
      cables: [],
      selected: state.selected?.type === "board" ? null : state.selected,
    })),

  setRoutingMode: (mode) => set({ routingMode: mode }),

  calculateRouting: () => {
    const state = get();
    if (!state.distributionBoard) return false;
    const cables = computeCables(
      state.devices,
      state.distributionBoard,
      state.walls,
      state.rooms,
      state.routingMode,
    );
    set({ cables });
    return true;
  },

  splitRoom: (roomId, direction, ratio, nameA, nameB) => {
    const room = get().rooms.find((r) => r.id === roomId);
    if (!room || !isAxisAlignedRectangle(room.polygon)) return false;

    const { polyA, polyB, wall } = splitRectangle(room.polygon, direction, ratio);
    const newWall: Wall = {
      id: generateId("wall"),
      floorId: room.floorId,
      start: wall.start,
      end: wall.end,
      thickness: 100,
      height: room.height,
    };
    const roomA: Room = {
      ...room,
      id: generateId("room"),
      name: nameA,
      polygon: polyA,
      area: polygonAreaSqMeters(polyA),
    };
    const roomB: Room = {
      ...room,
      id: generateId("room"),
      name: nameB,
      polygon: polyB,
      area: polygonAreaSqMeters(polyB),
    };

    set((state) => ({
      rooms: [...state.rooms.filter((r) => r.id !== roomId), roomA, roomB],
      walls: [...state.walls, newWall],
      selected: null,
    }));
    return true;
  },

  mergeRooms: (roomIdA, roomIdB, newName) => {
    const state = get();
    const roomA = state.rooms.find((r) => r.id === roomIdA);
    const roomB = state.rooms.find((r) => r.id === roomIdB);
    if (!roomA || !roomB) return false;

    const merged = tryMergeAdjacentRects(roomA.polygon, roomB.polygon);
    if (!merged) return false;

    const removedWall = state.walls.find((wall) =>
      wallMatchesSegment(wall, merged.sharedEdge),
    );
    const mergedRoom: Room = {
      ...roomA,
      name: newName,
      polygon: merged.polygon,
      area: polygonAreaSqMeters(merged.polygon),
    };

    set((current) => ({
      rooms: [
        ...current.rooms.filter((r) => r.id !== roomA.id && r.id !== roomB.id),
        mergedRoom,
      ],
      walls: removedWall
        ? current.walls.filter((wall) => wall.id !== removedWall.id)
        : current.walls,
      openings: removedWall
        ? current.openings.filter((opening) => opening.wallId !== removedWall.id)
        : current.openings,
      devices: removedWall
        ? current.devices.filter(
            (device) => !(device.mount.kind === "wall" && device.mount.wallId === removedWall.id),
          )
        : current.devices,
      distributionBoard:
        removedWall && current.distributionBoard?.wallId === removedWall.id
          ? null
          : current.distributionBoard,
      cables:
        removedWall && current.distributionBoard?.wallId === removedWall.id
          ? []
          : current.cables,
      selected: null,
    }));
    return true;
  },

  reviewActive: false,
  reviewQueue: [],
  reviewIndex: 0,
  focusTarget: null,
  startReview: (areas) =>
    set({
      reviewActive: true,
      reviewQueue: areas,
      reviewIndex: 0,
      focusTarget: areas[0]?.target ?? null,
      selected: selectionFromTarget(areas[0]?.target),
      zoom: 1,
    }),
  goToProblem: (index) =>
    set((state) => {
      const clamped = Math.min(Math.max(index, 0), state.reviewQueue.length - 1);
      const target = state.reviewQueue[clamped]?.target;
      return {
        reviewIndex: clamped,
        focusTarget: target ?? null,
        selected: selectionFromTarget(target),
        zoom: 1,
      };
    }),
  nextProblem: () => {
    const state = get();
    if (state.reviewIndex >= state.reviewQueue.length - 1) {
      get().exitReview();
      return;
    }
    get().goToProblem(state.reviewIndex + 1);
  },
  exitReview: () =>
    set({ reviewActive: false, reviewQueue: [], reviewIndex: 0, focusTarget: null }),
}));

export function roomAreaSqMeters(room: Room): number {
  return polygonAreaSqMeters(room.polygon);
}
