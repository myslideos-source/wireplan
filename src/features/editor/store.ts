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
  TreeBranch,
} from "@/domain";
import {
  polygonAreaSqMeters,
  DEVICE_MOUNT_KIND,
  DEVICE_DEFAULT_HEIGHT,
  LOXONE_SYSTEM,
  LOXONE_CATALOG,
  findSmartHomeModel,
  numberingPrefixFor,
  nextTreeBranchColor,
  MAX_TREE_DEVICES_PER_BRANCH,
} from "@/domain";
import type { FloorGeometry } from "./mock-geometry";
import type { FlaggedArea, FlaggedAreaTarget } from "@/features/plan-analysis/types";
import { computeCables } from "@/features/routing/compute-cables";
import { computeTreeBranchCables } from "@/features/routing/compute-tree-cables";
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
  wallsBoundingBox,
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
  | "door"
  | "window"
  | "background"
  | "cable";

export type LayerId = "grundriss" | "elektro" | "kabelwege" | "beschriftung" | "hintergrund";

/** §67 "Tree View" — a separate on/off switch (not a LayerId toggle,
 * since it dims *most* layers rather than hiding one) that focuses the
 * canvas on Tree devices and their bus cabling. */

/** The real, original uploaded plan image, positioned/scaled over the
 * floor's geometry as a tracing reference — for when the AI's estimated
 * room polygons aren't precise enough and the user's own plan already is. */
export interface BackgroundImage {
  dataUrl: string;
  x: number;
  y: number;
  width: number;
  height: number;
  aspectRatio: number;
}

const MIN_BACKGROUND_SIZE_MM = 300;

export type Selection =
  | { type: "room"; id: string }
  | { type: "wall"; id: string }
  | { type: "device"; id: string }
  | { type: "board" }
  | { type: "smarthome"; id: string }
  | { type: "opening"; id: string }
  | null;

const DEFAULT_OPENING_WIDTH: Record<"door" | "window", number> = {
  door: 900,
  window: 1200,
};

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
  backgroundImage: BackgroundImage | null;
  treeBranches: TreeBranch[];
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
    backgroundImage: null,
    treeBranches: [],
  };
}

/** Next free display number for a given prefix (§26) — scans both device
 * arrays so e.g. Touch Tree placed via the standalone Smart-Home tool and
 * a future Touch-typed ElectricalDevice would never collide on "T01". */
function nextNumberForPrefix(state: Pick<EditorState, "devices" | "smartHomeDevices">, prefix: string): number {
  const deviceNumbers = state.devices
    .filter((d) => numberingPrefixFor({ type: d.type }) === prefix)
    .map((d) => d.number);
  const smartHomeNumbers = state.smartHomeDevices
    .filter((d) => {
      const model = findSmartHomeModel(d.modelId);
      return (
        model &&
        numberingPrefixFor({ category: model.category, technology: model.technology }) === prefix
      );
    })
    .map((d) => d.number);
  return Math.max(0, ...deviceNumbers, ...smartHomeNumbers) + 1;
}

/** Tree-device count per branch, across both device arrays — used both to
 * pick a sensible default branch on placement (§77) and to render the
 * Tree-Ast-Übersicht. */
function countTreeDevicesByBranch(
  state: Pick<EditorState, "devices" | "smartHomeDevices">,
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const device of state.smartHomeDevices) {
    if (!device.treeBranchId) continue;
    const model = findSmartHomeModel(device.modelId);
    if (!model?.countsAsTreeDevice) continue;
    counts[device.treeBranchId] = (counts[device.treeBranchId] ?? 0) + 1;
  }
  for (const device of state.devices) {
    if (!device.treeBranchId) continue;
    const model = device.smartHomeModelId ? findSmartHomeModel(device.smartHomeModelId) : undefined;
    if (!model?.countsAsTreeDevice) continue;
    counts[device.treeBranchId] = (counts[device.treeBranchId] ?? 0) + 1;
  }
  return counts;
}

/** Picks the most recently created Tree branch on this floor that still
 * has room, or signals that a new one should be created — the "intelligent
 * default" from §77/§78: the user is never forced to manually assign a
 * branch, but always free to change the suggestion afterward. */
function suggestTreeBranchId(
  state: Pick<EditorState, "devices" | "smartHomeDevices" | "treeBranches">,
): string | null {
  const counts = countTreeDevicesByBranch(state);
  for (let i = state.treeBranches.length - 1; i >= 0; i -= 1) {
    const branch = state.treeBranches[i];
    if ((counts[branch.id] ?? 0) < MAX_TREE_DEVICES_PER_BRANCH) return branch.id;
  }
  return null;
}

/** Resolves what a device's `treeBranchId` should become after a model
 * (re)assignment: keep an existing assignment, suggest/create a branch for
 * a newly-Tree device, or clear it for a non-Tree model — the one place
 * this decision is made, reused by every placement/reassignment path. */
function resolveTreeBranchAssignment(
  state: Pick<EditorState, "devices" | "smartHomeDevices" | "treeBranches" | "floorId">,
  model: { countsAsTreeDevice: boolean } | undefined,
  existingBranchId: string | undefined,
): { treeBranchId: string | undefined; treeBranches: TreeBranch[] } {
  if (!model?.countsAsTreeDevice) {
    return { treeBranchId: undefined, treeBranches: state.treeBranches };
  }
  if (existingBranchId) {
    return { treeBranchId: existingBranchId, treeBranches: state.treeBranches };
  }
  const suggested = suggestTreeBranchId(state);
  if (suggested) {
    return { treeBranchId: suggested, treeBranches: state.treeBranches };
  }
  const branch: TreeBranch = {
    id: generateId("tree"),
    floorId: state.floorId ?? "",
    label: `Tree ${state.treeBranches.length + 1}`,
    colorHex: nextTreeBranchColor(state.treeBranches),
  };
  return { treeBranchId: branch.id, treeBranches: [...state.treeBranches, branch] };
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
  backgroundImage: BackgroundImage | null;
  treeBranches: TreeBranch[];
  createTreeBranch: (label?: string) => string;
  deleteTreeBranch: (id: string) => void;
  assignDeviceToTreeBranch: (deviceId: string, branchId: string | null) => void;
  hydrate: (geometries: FloorGeometry[]) => void;
  switchFloor: (floorId: string) => void;
  setBackgroundImage: (dataUrl: string, naturalWidth: number, naturalHeight: number) => void;
  moveBackgroundImageToPoint: (point: Point) => void;
  resizeBackgroundImageToPoint: (point: Point) => void;
  clearBackgroundImage: () => void;

  selected: Selection;
  select: (selection: Selection) => void;

  activeTool: EditorTool;
  setTool: (tool: EditorTool) => void;

  layers: Record<LayerId, boolean>;
  toggleLayer: (layer: LayerId) => void;

  treeViewActive: boolean;
  toggleTreeView: () => void;

  zoom: number;
  setZoom: (updater: number | ((zoom: number) => number)) => void;

  updateRoom: (id: string, patch: Partial<Pick<Room, "name" | "type" | "height">>) => void;
  updateWallThickness: (id: string, thicknessMm: number) => void;
  deleteOpening: (id: string) => void;
  addOpeningAtPoint: (type: Opening["type"], point: Point) => boolean;
  moveOpeningToPoint: (openingId: string, point: Point) => void;
  updateOpeningWidth: (id: string, width: number) => void;
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
  backgroundImage: null,
  treeBranches: [],

  createTreeBranch: (label) => {
    const state = get();
    const branch: TreeBranch = {
      id: generateId("tree"),
      floorId: state.floorId ?? "",
      label: label ?? `Tree ${state.treeBranches.length + 1}`,
      colorHex: nextTreeBranchColor(state.treeBranches),
    };
    set((s) => ({ treeBranches: [...s.treeBranches, branch] }));
    return branch.id;
  },

  deleteTreeBranch: (id) =>
    set((state) => ({
      treeBranches: state.treeBranches.filter((b) => b.id !== id),
      devices: state.devices.map((d) =>
        d.treeBranchId === id ? { ...d, treeBranchId: undefined } : d,
      ),
      smartHomeDevices: state.smartHomeDevices.map((d) =>
        d.treeBranchId === id ? { ...d, treeBranchId: undefined } : d,
      ),
    })),

  assignDeviceToTreeBranch: (deviceId, branchId) =>
    set((state) => ({
      devices: state.devices.map((d) =>
        d.id === deviceId ? { ...d, treeBranchId: branchId ?? undefined } : d,
      ),
      smartHomeDevices: state.smartHomeDevices.map((d) =>
        d.id === deviceId ? { ...d, treeBranchId: branchId ?? undefined } : d,
      ),
    })),

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
      backgroundImage: state.backgroundImage,
      treeBranches: state.treeBranches,
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

  layers: { grundriss: true, elektro: true, kabelwege: true, beschriftung: true, hintergrund: true },
  toggleLayer: (layer) =>
    set((state) => ({ layers: { ...state.layers, [layer]: !state.layers[layer] } })),

  treeViewActive: false,
  toggleTreeView: () => set((state) => ({ treeViewActive: !state.treeViewActive })),

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
      selected: state.selected?.type === "opening" && state.selected.id === id
        ? null
        : state.selected,
    })),

  addOpeningAtPoint: (type, point) => {
    const state = get();
    const wall = findNearestWall(state.walls, point);
    if (!wall) return false;
    const { offset } = closestPointOnWall(wall, point);
    const opening: Opening = {
      id: generateId("opening"),
      wallId: wall.id,
      type,
      offset,
      width: DEFAULT_OPENING_WIDTH[type],
    };
    set((s) => ({ openings: [...s.openings, opening] }));
    return true;
  },

  moveOpeningToPoint: (openingId, point) => {
    const state = get();
    const opening = state.openings.find((o) => o.id === openingId);
    if (!opening) return;
    const wall = state.walls.find((w) => w.id === opening.wallId);
    if (!wall) return;
    const { offset } = closestPointOnWall(wall, point);
    set((s) => ({
      openings: s.openings.map((o) => (o.id === openingId ? { ...o, offset } : o)),
    }));
  },

  updateOpeningWidth: (id, width) =>
    set((state) => ({
      openings: state.openings.map((o) => (o.id === id ? { ...o, width } : o)),
    })),

  addDeviceAtPoint: (type, point) => {
    const state = get();
    const mountKind = DEVICE_MOUNT_KIND[type];
    const height = DEVICE_DEFAULT_HEIGHT[type];
    const number = nextNumberForPrefix(state, numberingPrefixFor({ type }));

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
        number,
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
      number,
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

  assignDeviceSmartHomeModel: (deviceId, modelId) => {
    // Assigning a genuine Tree model suggests a branch right away (§76) —
    // the user is never left to work out the Tree assignment themselves.
    const state = get();
    const model = modelId ? findSmartHomeModel(modelId) : undefined;
    const device = state.devices.find((d) => d.id === deviceId);
    const { treeBranchId, treeBranches } = resolveTreeBranchAssignment(
      state,
      model,
      device?.treeBranchId,
    );
    set({
      treeBranches,
      devices: state.devices.map((d) =>
        d.id === deviceId
          ? { ...d, smartHomeModelId: modelId ?? undefined, treeBranchId }
          : d,
      ),
    });
  },

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
    const model = findSmartHomeModel(state.smartHomePlacementModelId);
    const number = nextNumberForPrefix(
      state,
      numberingPrefixFor({ category: model?.category, technology: model?.technology }),
    );
    const { treeBranchId, treeBranches: newBranches } = resolveTreeBranchAssignment(
      state,
      model,
      undefined,
    );

    const device: SmartHomeDevice = {
      id: generateId("smarthome"),
      floorId: state.floorId ?? "",
      systemId: LOXONE_SYSTEM.id,
      modelId: state.smartHomePlacementModelId,
      position: point,
      roomId: room?.id ?? null,
      treeBranchId,
      number,
    };
    set((s) => ({ smartHomeDevices: [...s.smartHomeDevices, device], treeBranches: newBranches }));
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

  setSmartHomeDeviceModel: (deviceId, modelId) => {
    const state = get();
    const model = findSmartHomeModel(modelId);
    const device = state.smartHomeDevices.find((d) => d.id === deviceId);
    const { treeBranchId, treeBranches } = resolveTreeBranchAssignment(
      state,
      model,
      device?.treeBranchId,
    );
    set({
      treeBranches,
      smartHomeDevices: state.smartHomeDevices.map((d) =>
        d.id === deviceId ? { ...d, modelId, treeBranchId } : d,
      ),
    });
  },

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

  setBackgroundImage: (dataUrl, naturalWidth, naturalHeight) => {
    const state = get();
    const aspectRatio = naturalWidth / naturalHeight;
    // Fit the image inside the floor's current extent so it's usable right
    // away instead of appearing off-screen or at the wrong scale.
    const box = wallsBoundingBox(state.walls, 0);
    let width = box.width;
    let height = width / aspectRatio;
    if (height > box.height) {
      height = box.height;
      width = height * aspectRatio;
    }
    const x = box.minX + (box.width - width) / 2;
    const y = box.minY + (box.height - height) / 2;
    set({ backgroundImage: { dataUrl, x, y, width, height, aspectRatio } });
  },

  moveBackgroundImageToPoint: (point) =>
    set((state) =>
      state.backgroundImage
        ? {
            backgroundImage: {
              ...state.backgroundImage,
              x: point.x - state.backgroundImage.width / 2,
              y: point.y - state.backgroundImage.height / 2,
            },
          }
        : {},
    ),

  resizeBackgroundImageToPoint: (point) =>
    set((state) => {
      if (!state.backgroundImage) return {};
      const image = state.backgroundImage;
      const width = Math.max(MIN_BACKGROUND_SIZE_MM, point.x - image.x);
      const height = width / image.aspectRatio;
      return { backgroundImage: { ...image, width, height } };
    }),

  clearBackgroundImage: () => set({ backgroundImage: null }),

  setRoutingMode: (mode) => set({ routingMode: mode }),

  calculateRouting: () => {
    const state = get();
    if (!state.distributionBoard) return false;
    const starCables = computeCables(
      state.devices,
      state.distributionBoard,
      state.walls,
      state.rooms,
      state.routingMode,
    );
    const treeCables = computeTreeBranchCables(
      state.treeBranches,
      state.devices,
      state.smartHomeDevices,
      state.distributionBoard,
      state.walls,
      state.routingMode,
    );
    set({ cables: [...starCables, ...treeCables] });
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
