"use client";

import { create } from "zustand";
import type { Wall, Room, Opening, Point, ElectricalDevice, ElectricalDeviceType } from "@/domain";
import { polygonAreaSqMeters, DEVICE_MOUNT_KIND, DEVICE_DEFAULT_HEIGHT } from "@/domain";
import type { FloorGeometry } from "./mock-geometry";
import type { FlaggedArea, FlaggedAreaTarget } from "@/features/plan-analysis/types";
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
  | "smarthome"
  | "cable";

export type LayerId = "grundriss" | "elektro" | "kabelwege" | "beschriftung";

export type Selection =
  | { type: "room"; id: string }
  | { type: "wall"; id: string }
  | { type: "device"; id: string }
  | null;

let nextGeneratedId = 1;
function generateId(prefix: string): string {
  return `${prefix}-gen-${nextGeneratedId++}`;
}

function selectionFromTarget(target: FlaggedAreaTarget | undefined): Selection {
  if (target?.type === "room") return { type: "room", id: target.id };
  if (target?.type === "wall") return { type: "wall", id: target.id };
  return null;
}

interface EditorState {
  floorId: string | null;
  walls: Wall[];
  rooms: Room[];
  openings: Opening[];
  devices: ElectricalDevice[];
  roomCircuits: Record<string, string | null>;
  hydrate: (geometry: FloorGeometry) => void;

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
  deleteDevice: (id: string) => void;
  setRoomCircuit: (roomId: string, circuitId: string | null) => void;
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
  walls: [],
  rooms: [],
  openings: [],
  devices: [],
  roomCircuits: {},
  hydrate: (geometry) => {
    // Re-hydrate whenever a different floor's geometry is passed in (e.g.
    // navigating from one project's editor to another's without a full
    // page reload) but skip redundant resets of in-progress edits.
    if (get().floorId === geometry.floor.id) return;
    set({
      floorId: geometry.floor.id,
      walls: geometry.walls,
      rooms: geometry.rooms,
      openings: geometry.openings,
      devices: [],
      roomCircuits: {},
      selected: null,
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
