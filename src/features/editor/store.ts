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
  CableType,
  RoutingMode,
  SmartHomeDevice,
  TreeBranch,
  TreeJunction,
  TreeEdge,
  AudioZone,
  FixedConsumer,
  FixedConsumerType,
  NetworkDeviceSubtype,
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
  SPEAKER_CABLE_TYPES,
  FIXED_CONSUMER_DEFAULT_CABLE,
} from "@/domain";
import type { FloorGeometry } from "./mock-geometry";
import type { FlaggedArea, FlaggedAreaTarget } from "@/features/plan-analysis/types";
import { computeCables } from "@/features/routing/compute-cables";
import { computeTreeBranchCables } from "@/features/routing/compute-tree-cables";
import { computeAudioCables } from "@/features/routing/compute-audio-cables";
import { computeConsumerCables } from "@/features/routing/compute-consumer-cables";
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
  computeSpotArrayPositions,
  polygonCentroid,
  devicePosition,
  type SplitDirection,
  type SpotArrangement,
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
  | "consumer"
  | "door"
  | "window"
  | "background"
  | "cable"
  | "junction"
  | "treeConnect";

export type LayerId = "grundriss" | "elektro" | "kabelwege" | "beschriftung" | "hintergrund";

/** §66-71 — focused views that dim everything except one concern, rather
 * than a LayerId toggle (which only shows/hides a whole layer). */
export type ViewMode = "alle" | "tree" | "audio" | "network" | "power";

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
  | { type: "consumer"; id: string }
  | { type: "junction"; id: string }
  | null;

/** §49 — multi-select, scoped to point-placeable items (devices,
 * standalone Smart-Home devices, fixed consumers). Rooms/walls/openings
 * stay single-select: they're anchored to geometry, not freely movable
 * points, so "align" or "distribute" don't apply to them. */
export interface MultiSelectItem {
  type: "device" | "smarthome" | "consumer";
  id: string;
}

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
  audioZones: AudioZone[];
  fixedConsumers: FixedConsumer[];
  treeJunctions: TreeJunction[];
  treeEdges: TreeEdge[];
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
    audioZones: [],
    fixedConsumers: [],
    treeJunctions: [],
    treeEdges: [],
  };
}

/** The keys that make up one floor's editable content (§47's undo/redo
 * history operates on exactly this — not on UI state like selection,
 * zoom, or the active tool, which shouldn't be undoable). Also reused by
 * switchFloor to snapshot/restore a floor's slice. */
const SLICE_KEYS: (keyof FloorMutableSlice)[] = [
  "walls",
  "rooms",
  "openings",
  "devices",
  "roomCircuits",
  "technikraumRoomId",
  "distributionBoard",
  "cables",
  "smartHomeDevices",
  "backgroundImage",
  "treeBranches",
  "audioZones",
  "fixedConsumers",
  "treeJunctions",
  "treeEdges",
];

function sliceOf(state: FloorMutableSlice): FloorMutableSlice {
  const entries = SLICE_KEYS.map((key) => [key, state[key]] as const);
  return Object.fromEntries(entries) as unknown as FloorMutableSlice;
}

function sliceChanged(a: FloorMutableSlice, b: FloorMutableSlice): boolean {
  return SLICE_KEYS.some((key) => a[key] !== b[key]);
}

const MAX_HISTORY = 100;

/** Guards the undo/redo-triggered `set()` calls (and floor hydration/
 * switching) from being recorded as new history entries by the subscriber
 * below — those are restorations or floor swaps, not user edits. */
let isRestoringHistory = false;

/** Next free display number for a given prefix (§26) — scans both device
 * arrays so e.g. Touch Tree placed via the standalone Smart-Home tool and
 * a future Touch-typed ElectricalDevice would never collide on "T01". */
function nextNumberForPrefix(state: Pick<EditorState, "devices" | "smartHomeDevices">, prefix: string): number {
  const deviceNumbers = state.devices
    .filter((d) => numberingPrefixFor({ type: d.type, networkDeviceSubtype: d.networkDeviceSubtype }) === prefix)
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

/** §61 — resolves a tagged Tree node reference ("board", "device:<id>",
 * "smarthome:<id>", "junction:<id>") to its world position and current
 * branch, the one place `handleTreeConnectClick` and the bus-length
 * calculation both need to turn a reference back into real data. */
function resolveTreeNodeRef(
  state: Pick<EditorState, "devices" | "smartHomeDevices" | "treeJunctions" | "walls" | "distributionBoard">,
  ref: string,
): { position: Point; treeBranchId: string | undefined } | null {
  if (ref === "board") {
    if (!state.distributionBoard) return null;
    const wall = state.walls.find((w) => w.id === state.distributionBoard!.wallId);
    if (!wall) return null;
    return { position: pointAtOffset(wall, state.distributionBoard.offset), treeBranchId: undefined };
  }
  const separatorIndex = ref.indexOf(":");
  if (separatorIndex === -1) return null;
  const kind = ref.slice(0, separatorIndex);
  const id = ref.slice(separatorIndex + 1);
  if (kind === "device") {
    const device = state.devices.find((d) => d.id === id);
    if (!device) return null;
    const position = devicePosition(device, state.walls);
    if (!position) return null;
    return { position, treeBranchId: device.treeBranchId };
  }
  if (kind === "smarthome") {
    const device = state.smartHomeDevices.find((d) => d.id === id);
    if (!device) return null;
    return { position: device.position, treeBranchId: device.treeBranchId };
  }
  if (kind === "junction") {
    const junction = state.treeJunctions.find((j) => j.id === id);
    if (!junction) return null;
    return { position: junction.position, treeBranchId: junction.treeBranchId };
  }
  return null;
}

/** Reads a multi-select item's current position — only point-mounted
 * devices, standalone Smart-Home devices, and fixed consumers have one;
 * wall-mounted devices return null and are silently skipped by
 * align/distribute (they're constrained to their wall, not freely
 * movable in the plane those operations work in). */
function getMultiSelectPosition(
  state: Pick<EditorState, "devices" | "smartHomeDevices" | "fixedConsumers">,
  item: MultiSelectItem,
): Point | null {
  if (item.type === "smarthome") {
    return state.smartHomeDevices.find((d) => d.id === item.id)?.position ?? null;
  }
  if (item.type === "consumer") {
    return state.fixedConsumers.find((c) => c.id === item.id)?.position ?? null;
  }
  const device = state.devices.find((d) => d.id === item.id);
  return device?.mount.kind === "point" ? device.mount.position : null;
}

const SNAP_GRID_MM = 50;
const SNAP_MAGNET_THRESHOLD_MM = 180;

/** §51 — snapping while placing/dragging a point-mounted item. Magnetism
 * (to another device or a room's center) wins over the grid when the
 * point is close enough to one; otherwise the point snaps to the nearest
 * grid intersection. Wall-mounted devices/openings already snap to their
 * wall via closestPointOnWall — a separate, already-correct behavior
 * this doesn't touch. */
function applySnap(
  state: Pick<EditorState, "snapEnabled" | "devices" | "smartHomeDevices" | "fixedConsumers" | "rooms">,
  point: Point,
): Point {
  if (!state.snapEnabled) return point;

  const candidates: Point[] = [];
  for (const device of state.devices) {
    if (device.mount.kind === "point") candidates.push(device.mount.position);
  }
  for (const device of state.smartHomeDevices) candidates.push(device.position);
  for (const consumer of state.fixedConsumers) candidates.push(consumer.position);
  for (const room of state.rooms) candidates.push(polygonCentroid(room.polygon));

  let nearest: Point | null = null;
  let nearestDistance = SNAP_MAGNET_THRESHOLD_MM;
  for (const candidate of candidates) {
    const distance = Math.hypot(candidate.x - point.x, candidate.y - point.y);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearest = candidate;
    }
  }
  if (nearest) return nearest;

  return {
    x: Math.round(point.x / SNAP_GRID_MM) * SNAP_GRID_MM,
    y: Math.round(point.y / SNAP_GRID_MM) * SNAP_GRID_MM,
  };
}

function moveMultiSelectItem(get: () => EditorState, item: MultiSelectItem, point: Point) {
  if (item.type === "device") get().moveDeviceToPoint(item.id, point);
  else if (item.type === "smarthome") get().moveSmartHomeDeviceToPoint(item.id, point);
  else get().moveFixedConsumerToPoint(item.id, point);
}

/** Resolves what a speaker's `audioZoneId` should become (§12/§76): keep
 * an existing assignment, reuse a zone already named after the device's
 * room, create a room-named zone, or clear it for a non-audio model.
 * Unlike Tree branches there's no capacity limit to route around. */
function resolveAudioZoneAssignment(
  state: Pick<EditorState, "audioZones" | "rooms" | "floorId">,
  model: { technology: string } | undefined,
  existingZoneId: string | undefined,
  roomId: string | null,
): { audioZoneId: string | undefined; audioZones: AudioZone[] } {
  if (model?.technology !== "audio") {
    return { audioZoneId: undefined, audioZones: state.audioZones };
  }
  if (existingZoneId) {
    return { audioZoneId: existingZoneId, audioZones: state.audioZones };
  }
  const roomName = roomId ? state.rooms.find((r) => r.id === roomId)?.name : undefined;
  const zoneName = roomName ?? `Zone ${state.audioZones.length + 1}`;
  const existingZone = state.audioZones.find((z) => z.name === zoneName);
  if (existingZone) {
    return { audioZoneId: existingZone.id, audioZones: state.audioZones };
  }
  const zone: AudioZone = { id: generateId("audio-zone"), floorId: state.floorId ?? "", name: zoneName };
  return { audioZoneId: zone.id, audioZones: [...state.audioZones, zone] };
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

  // §61 — manual junction points and bus edges, so a branch's topology
  // can be a real graph instead of always the auto nearest-neighbor chain.
  treeJunctions: TreeJunction[];
  treeEdges: TreeEdge[];
  addTreeJunctionAtPoint: (point: Point) => boolean;
  moveTreeJunctionToPoint: (id: string, point: Point) => void;
  deleteTreeJunction: (id: string) => void;
  assignJunctionToTreeBranch: (id: string, branchId: string | null) => void;
  treeConnectPendingNodeRef: string | null;
  handleTreeConnectClick: (nodeRef: string) => void;
  cancelTreeConnect: () => void;
  deleteTreeEdge: (id: string) => void;

  audioZones: AudioZone[];
  speakerCableType: CableType;
  setSpeakerCableType: (type: CableType) => void;
  createAudioZone: (name?: string) => string;
  deleteAudioZone: (id: string) => void;
  assignDeviceToAudioZone: (deviceId: string, zoneId: string | null) => void;

  // §10 — Feste Verbraucher / Zuleitungen.
  fixedConsumers: FixedConsumer[];
  fixedConsumerPlacementType: FixedConsumerType;
  fixedConsumerCustomLabel: string;
  setFixedConsumerPlacementType: (type: FixedConsumerType) => void;
  setFixedConsumerCustomLabel: (label: string) => void;
  addFixedConsumerAtPoint: (point: Point) => boolean;
  moveFixedConsumerToPoint: (id: string, point: Point) => void;
  deleteFixedConsumer: (id: string) => void;
  updateFixedConsumerCableType: (id: string, cableType: CableType) => void;
  setFixedConsumerReserveConduit: (id: string, reserveConduit: boolean) => void;

  // §13 — Netzwerkgeräte-Subtyp (Dose/Access Point/Kamera/Türsprechanlage/
  // PoE-Switch), each with its own Nummerierungspräfix and Kabeltyp.
  networkDevicePlacementSubtype: NetworkDeviceSubtype;
  setNetworkDevicePlacementSubtype: (subtype: NetworkDeviceSubtype) => void;
  updateDeviceNetworkSubtype: (id: string, subtype: NetworkDeviceSubtype) => void;
  updateDeviceMeta: (id: string, patch: Partial<Pick<ElectricalDevice, "rotation" | "notes">>) => void;

  // §47 — undo/redo history for this floor's editable content (not UI
  // state). Recorded automatically by a subscriber set up right after the
  // store is created; see SLICE_KEYS/sliceChanged/isRestoringHistory above.
  history: FloorMutableSlice[];
  future: FloorMutableSlice[];
  undo: () => void;
  redo: () => void;

  hydrate: (geometries: FloorGeometry[]) => void;
  switchFloor: (floorId: string) => void;
  setBackgroundImage: (dataUrl: string, naturalWidth: number, naturalHeight: number) => void;
  moveBackgroundImageToPoint: (point: Point) => void;
  resizeBackgroundImageToPoint: (point: Point) => void;
  clearBackgroundImage: () => void;

  selected: Selection;
  select: (selection: Selection) => void;

  // §48-50 — multi-select, duplicate, align, distribute.
  multiSelection: MultiSelectItem[];
  toggleMultiSelect: (item: MultiSelectItem) => void;
  clearMultiSelection: () => void;
  deleteMultiSelection: () => void;
  duplicateMultiSelection: () => void;
  alignMultiSelection: (axis: "horizontal" | "vertical") => void;
  distributeMultiSelection: (axis: "horizontal" | "vertical") => void;

  activeTool: EditorTool;
  setTool: (tool: EditorTool) => void;

  layers: Record<LayerId, boolean>;
  toggleLayer: (layer: LayerId) => void;

  // §66-71 — a focused view dims everything except the layer it's about;
  // "alle" is the normal, undimmed editor.
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;

  // §86-87 — the left editor panel's two tabs: "Elemente" (the tool
  // list, today's default) and "Räume" (a room list + colored room-zone
  // overlay on the canvas). Pure UI state, like activeTool/viewMode —
  // not undo-tracked, not per-floor.
  leftPanelTab: "elemente" | "raeume";
  setLeftPanelTab: (tab: "elemente" | "raeume") => void;

  // §8 — Original (the raw uploaded reference plan, if any) vs. Planer
  // (today's normal vector rendering). Pure UI state.
  planViewMode: "original" | "planer";
  setPlanViewMode: (mode: "original" | "planer") => void;

  // §51 — snap to grid / wall / room-center / other devices.
  snapEnabled: boolean;
  toggleSnap: () => void;

  // §5 — hide superseded/discontinued Loxone hardware from pickers by
  // default; already-assigned legacy devices stay visible/selectable.
  showLegacySmartHomeDevices: boolean;
  toggleShowLegacySmartHomeDevices: () => void;

  zoom: number;
  setZoom: (updater: number | ((zoom: number) => number)) => void;

  // §20 — how visible the uploaded reference plan is under the vector
  // drawing; a view preference like zoom, not floor content, so it isn't
  // part of undo history or per-floor state.
  backgroundImageOpacity: number;
  setBackgroundImageOpacity: (opacity: number) => void;

  updateRoom: (id: string, patch: Partial<Pick<Room, "name" | "type" | "height" | "notes">>) => void;
  updateWallThickness: (id: string, thicknessMm: number) => void;
  deleteOpening: (id: string) => void;
  addOpeningAtPoint: (type: Opening["type"], point: Point) => boolean;
  moveOpeningToPoint: (openingId: string, point: Point) => void;
  updateOpeningWidth: (id: string, width: number) => void;
  addDeviceAtPoint: (type: ElectricalDeviceType, point: Point) => boolean;
  // §8 — "Mehrere Spots platzieren": when count > 1, a light-tool click
  // fills the clicked room with an auto-distributed spot array instead of
  // a single light at the exact click point.
  spotArrayCount: number;
  spotArrayArrangement: SpotArrangement;
  setSpotArrayCount: (count: number) => void;
  setSpotArrayArrangement: (arrangement: SpotArrangement) => void;
  addSpotArrayAtPoint: (point: Point) => boolean;
  moveDeviceToPoint: (deviceId: string, point: Point) => void;
  deleteDevice: (id: string) => void;
  duplicateDevice: (id: string) => void;
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
  treeJunctions: [],
  treeEdges: [],
  treeConnectPendingNodeRef: null,
  audioZones: [],
  speakerCableType: SPEAKER_CABLE_TYPES[0],
  setSpeakerCableType: (type) => set({ speakerCableType: type }),
  createAudioZone: (name) => {
    const state = get();
    const zone: AudioZone = {
      id: generateId("audio-zone"),
      floorId: state.floorId ?? "",
      name: name ?? `Zone ${state.audioZones.length + 1}`,
    };
    set((s) => ({ audioZones: [...s.audioZones, zone] }));
    return zone.id;
  },
  deleteAudioZone: (id) =>
    set((state) => ({
      audioZones: state.audioZones.filter((z) => z.id !== id),
      smartHomeDevices: state.smartHomeDevices.map((d) =>
        d.audioZoneId === id ? { ...d, audioZoneId: undefined } : d,
      ),
    })),
  assignDeviceToAudioZone: (deviceId, zoneId) =>
    set((state) => ({
      smartHomeDevices: state.smartHomeDevices.map((d) =>
        d.id === deviceId ? { ...d, audioZoneId: zoneId ?? undefined } : d,
      ),
    })),

  fixedConsumers: [],
  fixedConsumerPlacementType: "herd",
  fixedConsumerCustomLabel: "",
  setFixedConsumerPlacementType: (type) => set({ fixedConsumerPlacementType: type }),
  setFixedConsumerCustomLabel: (label) => set({ fixedConsumerCustomLabel: label }),

  addFixedConsumerAtPoint: (rawPoint) => {
    const state = get();
    const point = applySnap(state, rawPoint);
    const room = state.rooms.find((r) => isPointInPolygon(point, r.polygon));
    const type = state.fixedConsumerPlacementType;
    const consumer: FixedConsumer = {
      id: generateId("consumer"),
      floorId: state.floorId ?? "",
      type,
      customLabel: type === "custom" ? state.fixedConsumerCustomLabel || undefined : undefined,
      position: point,
      roomId: room?.id ?? null,
      cableType: FIXED_CONSUMER_DEFAULT_CABLE[type],
      reserveConduit: false,
      number: Math.max(0, ...state.fixedConsumers.map((c) => c.number)) + 1,
    };
    set((s) => ({ fixedConsumers: [...s.fixedConsumers, consumer] }));
    return true;
  },

  moveFixedConsumerToPoint: (id, rawPoint) => {
    const state = get();
    const point = applySnap(state, rawPoint);
    const room = state.rooms.find((r) => isPointInPolygon(point, r.polygon));
    set((s) => ({
      fixedConsumers: s.fixedConsumers.map((c) =>
        c.id === id ? { ...c, position: point, roomId: room?.id ?? null } : c,
      ),
    }));
  },

  deleteFixedConsumer: (id) =>
    set((state) => ({
      fixedConsumers: state.fixedConsumers.filter((c) => c.id !== id),
      selected: state.selected?.type === "consumer" && state.selected.id === id ? null : state.selected,
    })),

  updateFixedConsumerCableType: (id, cableType) =>
    set((state) => ({
      fixedConsumers: state.fixedConsumers.map((c) => (c.id === id ? { ...c, cableType } : c)),
    })),

  setFixedConsumerReserveConduit: (id, reserveConduit) =>
    set((state) => ({
      fixedConsumers: state.fixedConsumers.map((c) => (c.id === id ? { ...c, reserveConduit } : c)),
    })),

  networkDevicePlacementSubtype: "dose",
  setNetworkDevicePlacementSubtype: (subtype) => set({ networkDevicePlacementSubtype: subtype }),
  updateDeviceNetworkSubtype: (id, subtype) =>
    set((state) => ({
      devices: state.devices.map((d) => (d.id === id ? { ...d, networkDeviceSubtype: subtype } : d)),
    })),

  updateDeviceMeta: (id, patch) =>
    set((state) => ({
      devices: state.devices.map((d) => (d.id === id ? { ...d, ...patch } : d)),
    })),

  spotArrayCount: 1,
  spotArrayArrangement: "grid",
  setSpotArrayCount: (count) => set({ spotArrayCount: count }),
  setSpotArrayArrangement: (arrangement) => set({ spotArrayArrangement: arrangement }),

  addSpotArrayAtPoint: (point) => {
    const state = get();
    const room = state.rooms.find((r) => isPointInPolygon(point, r.polygon));
    if (!room) return false;
    const positions = computeSpotArrayPositions(room, state.spotArrayCount, state.spotArrayArrangement);
    const height = DEVICE_DEFAULT_HEIGHT.light;
    let number = nextNumberForPrefix(state, numberingPrefixFor({ type: "light" }));
    const newDevices: ElectricalDevice[] = positions.map((position) => {
      const device: ElectricalDevice = {
        id: generateId("device"),
        floorId: state.floorId ?? "",
        type: "light",
        mount: { kind: "point", position, height },
        roomId: room.id,
        number,
      };
      number += 1;
      return device;
    });
    set((s) => ({ devices: [...s.devices, ...newDevices] }));
    return true;
  },

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
      treeJunctions: state.treeJunctions.filter((j) => j.treeBranchId !== id),
      treeEdges: state.treeEdges.filter((e) => e.treeBranchId !== id),
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

  addTreeJunctionAtPoint: (rawPoint) => {
    const state = get();
    const point = applySnap(state, rawPoint);
    const { treeBranchId, treeBranches } = resolveTreeBranchAssignment(
      state,
      { countsAsTreeDevice: true },
      undefined,
    );
    if (!treeBranchId) return false;
    const junction: TreeJunction = {
      id: generateId("junction"),
      floorId: state.floorId ?? "",
      treeBranchId,
      position: point,
    };
    set({ treeBranches, treeJunctions: [...state.treeJunctions, junction] });
    return true;
  },

  moveTreeJunctionToPoint: (id, rawPoint) => {
    const state = get();
    const point = applySnap(state, rawPoint);
    set({
      treeJunctions: state.treeJunctions.map((j) => (j.id === id ? { ...j, position: point } : j)),
    });
  },

  deleteTreeJunction: (id) =>
    set((state) => {
      const ref = `junction:${id}`;
      return {
        treeJunctions: state.treeJunctions.filter((j) => j.id !== id),
        treeEdges: state.treeEdges.filter((e) => e.fromRef !== ref && e.toRef !== ref),
        selected: state.selected?.type === "junction" && state.selected.id === id ? null : state.selected,
      };
    }),

  assignJunctionToTreeBranch: (id, branchId) =>
    set((state) => {
      if (!branchId) return { treeJunctions: state.treeJunctions.filter((j) => j.id !== id) };
      const ref = `junction:${id}`;
      return {
        treeJunctions: state.treeJunctions.map((j) => (j.id === id ? { ...j, treeBranchId: branchId } : j)),
        // Reassigning to a different branch invalidates this junction's
        // existing edges (they'd otherwise silently cross branches).
        treeEdges: state.treeEdges.filter((e) => e.fromRef !== ref && e.toRef !== ref),
      };
    }),

  cancelTreeConnect: () => set({ treeConnectPendingNodeRef: null }),

  handleTreeConnectClick: (nodeRef) => {
    const state = get();
    const pending = state.treeConnectPendingNodeRef;
    if (!pending) {
      set({ treeConnectPendingNodeRef: nodeRef });
      return;
    }
    if (pending === nodeRef) {
      set({ treeConnectPendingNodeRef: null });
      return;
    }
    const a = resolveTreeNodeRef(state, pending);
    const b = resolveTreeNodeRef(state, nodeRef);
    set({ treeConnectPendingNodeRef: null });
    if (!a || !b) return;
    // Both ends need a branch, and — when both already belong to one —
    // they must agree; connecting two different branches would silently
    // merge them, which is a decision the user should make explicitly
    // (e.g. by reassigning a device's branch), not a side effect of a click.
    if (a.treeBranchId && b.treeBranchId && a.treeBranchId !== b.treeBranchId) return;
    const treeBranchId = a.treeBranchId ?? b.treeBranchId;
    if (!treeBranchId) return;
    const edge: TreeEdge = { id: generateId("edge"), treeBranchId, fromRef: pending, toRef: nodeRef };
    set((s) => ({ treeEdges: [...s.treeEdges, edge] }));
  },

  deleteTreeEdge: (id) =>
    set((state) => ({ treeEdges: state.treeEdges.filter((e) => e.id !== id) })),

  history: [],
  future: [],
  undo: () => {
    const state = get();
    if (state.history.length === 0) return;
    const previous = state.history[state.history.length - 1];
    const currentSnapshot = sliceOf(state);
    isRestoringHistory = true;
    set({
      ...previous,
      history: state.history.slice(0, -1),
      future: [...state.future, currentSnapshot].slice(-MAX_HISTORY),
      selected: null,
    });
    isRestoringHistory = false;
  },
  redo: () => {
    const state = get();
    if (state.future.length === 0) return;
    const next = state.future[state.future.length - 1];
    const currentSnapshot = sliceOf(state);
    isRestoringHistory = true;
    set({
      ...next,
      future: state.future.slice(0, -1),
      history: [...state.history, currentSnapshot].slice(-MAX_HISTORY),
      selected: null,
    });
    isRestoringHistory = false;
  },

  hydrate: (geometries) => {
    // Re-hydrate whenever a different project's floors are passed in (e.g.
    // navigating from one project's editor to another's without a full
    // page reload) but skip redundant resets of in-progress edits.
    const first = geometries[0];
    if (!first) return;
    if (get().floors[0]?.floor.projectId === first.floor.projectId) return;
    isRestoringHistory = true;
    set({
      floors: geometries,
      floorCache: {},
      floorId: first.floor.id,
      ...freshSliceFromGeometry(first),
      selected: null,
      history: [],
      future: [],
    });
    isRestoringHistory = false;
  },

  switchFloor: (floorId) => {
    const state = get();
    if (state.floorId === floorId) return;
    const currentFloorId = state.floorId;
    const currentSlice = sliceOf(state);
    const newCache = currentFloorId
      ? { ...state.floorCache, [currentFloorId]: currentSlice }
      : state.floorCache;

    const target = state.floors.find((f) => f.floor.id === floorId);
    if (!target) return;
    const slice = newCache[floorId] ?? freshSliceFromGeometry(target);

    isRestoringHistory = true;
    set({
      floorCache: newCache,
      floorId,
      ...slice,
      selected: null,
      activeTool: "select",
      // Undo history is per-floor content, but this phase keeps it simple
      // and doesn't cache history alongside the rest of the floor slice —
      // switching floors starts a fresh history rather than carrying it.
      history: [],
      future: [],
    });
    isRestoringHistory = false;
  },

  selected: null,
  select: (selection) => set({ selected: selection }),

  multiSelection: [],
  toggleMultiSelect: (item) =>
    set((state) => {
      const exists = state.multiSelection.some((s) => s.type === item.type && s.id === item.id);
      if (exists) {
        return {
          multiSelection: state.multiSelection.filter((s) => !(s.type === item.type && s.id === item.id)),
        };
      }
      // The very first Shift+Click after a plain click should extend the
      // single selection, not replace it — seed the multi-selection with
      // whatever was already singly selected (if it's a multi-selectable
      // kind) before adding the newly shift-clicked item.
      let base = state.multiSelection;
      if (base.length === 0 && state.selected) {
        const selected = state.selected;
        if (
          (selected.type === "device" || selected.type === "smarthome" || selected.type === "consumer") &&
          !(selected.type === item.type && selected.id === item.id)
        ) {
          base = [selected];
        }
      }
      return { multiSelection: [...base, item] };
    }),
  clearMultiSelection: () => set({ multiSelection: [] }),

  deleteMultiSelection: () => {
    const state = get();
    for (const item of state.multiSelection) {
      if (item.type === "device") get().deleteDevice(item.id);
      else if (item.type === "smarthome") get().deleteSmartHomeDevice(item.id);
      else get().deleteFixedConsumer(item.id);
    }
    set({ multiSelection: [] });
  },

  duplicateMultiSelection: () => {
    const state = get();
    const OFFSET = 300;
    const newDevices: ElectricalDevice[] = [];
    const newSmartHomeDevices: SmartHomeDevice[] = [];
    const newConsumers: FixedConsumer[] = [];
    const newSelection: MultiSelectItem[] = [];

    function roomAt(point: Point) {
      return state.rooms.find((r) => isPointInPolygon(point, r.polygon))?.id ?? null;
    }

    for (const item of state.multiSelection) {
      if (item.type === "device") {
        const device = state.devices.find((d) => d.id === item.id);
        if (!device || device.mount.kind !== "point") continue;
        const position = { x: device.mount.position.x + OFFSET, y: device.mount.position.y + OFFSET };
        const id = generateId("device");
        const number = nextNumberForPrefix(
          { devices: [...state.devices, ...newDevices], smartHomeDevices: state.smartHomeDevices },
          numberingPrefixFor({ type: device.type }),
        );
        newDevices.push({
          ...device,
          id,
          mount: { ...device.mount, position },
          roomId: roomAt(position),
          number,
        });
        newSelection.push({ type: "device", id });
      } else if (item.type === "smarthome") {
        const device = state.smartHomeDevices.find((d) => d.id === item.id);
        if (!device) continue;
        const model = findSmartHomeModel(device.modelId);
        const position = { x: device.position.x + OFFSET, y: device.position.y + OFFSET };
        const id = generateId("smarthome");
        const number = nextNumberForPrefix(
          { devices: state.devices, smartHomeDevices: [...state.smartHomeDevices, ...newSmartHomeDevices] },
          numberingPrefixFor({ category: model?.category, technology: model?.technology }),
        );
        newSmartHomeDevices.push({ ...device, id, position, roomId: roomAt(position), number });
        newSelection.push({ type: "smarthome", id });
      } else {
        const consumer = state.fixedConsumers.find((c) => c.id === item.id);
        if (!consumer) continue;
        const position = { x: consumer.position.x + OFFSET, y: consumer.position.y + OFFSET };
        const id = generateId("consumer");
        const number =
          Math.max(0, ...state.fixedConsumers.map((c) => c.number), ...newConsumers.map((c) => c.number)) + 1;
        newConsumers.push({ ...consumer, id, position, roomId: roomAt(position), number });
        newSelection.push({ type: "consumer", id });
      }
    }

    set({
      devices: [...state.devices, ...newDevices],
      smartHomeDevices: [...state.smartHomeDevices, ...newSmartHomeDevices],
      fixedConsumers: [...state.fixedConsumers, ...newConsumers],
      multiSelection: newSelection,
    });
  },

  alignMultiSelection: (axis) => {
    const state = get();
    const positions = state.multiSelection
      .map((item) => ({ item, point: getMultiSelectPosition(state, item) }))
      .filter((x): x is { item: MultiSelectItem; point: Point } => x.point !== null);
    if (positions.length < 2) return;
    const average =
      axis === "horizontal"
        ? positions.reduce((sum, p) => sum + p.point.y, 0) / positions.length
        : positions.reduce((sum, p) => sum + p.point.x, 0) / positions.length;
    for (const { item, point } of positions) {
      const target = axis === "horizontal" ? { x: point.x, y: average } : { x: average, y: point.y };
      moveMultiSelectItem(get, item, target);
    }
  },

  distributeMultiSelection: (axis) => {
    const state = get();
    const positions = state.multiSelection
      .map((item) => ({ item, point: getMultiSelectPosition(state, item) }))
      .filter((x): x is { item: MultiSelectItem; point: Point } => x.point !== null);
    if (positions.length < 3) return;
    const sorted = [...positions].sort((a, b) =>
      axis === "horizontal" ? a.point.x - b.point.x : a.point.y - b.point.y,
    );
    const first = sorted[0].point;
    const last = sorted[sorted.length - 1].point;
    const lastIndex = sorted.length - 1;
    sorted.forEach(({ item, point }, index) => {
      if (index === 0 || index === lastIndex) return;
      const t = index / lastIndex;
      const target =
        axis === "horizontal"
          ? { x: first.x + (last.x - first.x) * t, y: point.y }
          : { x: point.x, y: first.y + (last.y - first.y) * t };
      moveMultiSelectItem(get, item, target);
    });
  },

  activeTool: "select",
  setTool: (tool) => set({ activeTool: tool }),

  layers: { grundriss: true, elektro: true, kabelwege: true, beschriftung: true, hintergrund: true },
  toggleLayer: (layer) =>
    set((state) => ({ layers: { ...state.layers, [layer]: !state.layers[layer] } })),

  viewMode: "alle",
  setViewMode: (mode) => set({ viewMode: mode }),

  leftPanelTab: "elemente",
  setLeftPanelTab: (tab) => set({ leftPanelTab: tab }),

  planViewMode: "planer",
  setPlanViewMode: (mode) => set({ planViewMode: mode }),

  snapEnabled: true,
  toggleSnap: () => set((state) => ({ snapEnabled: !state.snapEnabled })),

  showLegacySmartHomeDevices: false,
  toggleShowLegacySmartHomeDevices: () =>
    set((state) => ({ showLegacySmartHomeDevices: !state.showLegacySmartHomeDevices })),

  backgroundImageOpacity: 0.75,
  setBackgroundImageOpacity: (opacity) =>
    set({ backgroundImageOpacity: Math.min(1, Math.max(0.3, opacity)) }),

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

  addDeviceAtPoint: (type, rawPoint) => {
    const state = get();
    const mountKind = DEVICE_MOUNT_KIND[type];
    const height = DEVICE_DEFAULT_HEIGHT[type];
    const networkDeviceSubtype = type === "network" ? state.networkDevicePlacementSubtype : undefined;
    const number = nextNumberForPrefix(state, numberingPrefixFor({ type, networkDeviceSubtype }));
    const point = mountKind === "point" ? applySnap(state, rawPoint) : rawPoint;

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
        networkDeviceSubtype,
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
      networkDeviceSubtype,
      number,
    };
    set((s) => ({ devices: [...s.devices, device] }));
    return true;
  },

  moveDeviceToPoint: (deviceId, rawPoint) => {
    const state = get();
    const device = state.devices.find((d) => d.id === deviceId);
    if (!device) return;
    const point = device.mount.kind === "point" ? applySnap(state, rawPoint) : rawPoint;

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
    set((state) => {
      const ref = `device:${id}`;
      return {
        devices: state.devices.filter((device) => device.id !== id),
        treeEdges: state.treeEdges.filter((e) => e.fromRef !== ref && e.toRef !== ref),
        selected: state.selected?.type === "device" && state.selected.id === id
          ? null
          : state.selected,
      };
    }),

  duplicateDevice: (id) => {
    const state = get();
    const device = state.devices.find((d) => d.id === id);
    if (!device) return;
    const number = nextNumberForPrefix(
      state,
      numberingPrefixFor({ type: device.type, networkDeviceSubtype: device.networkDeviceSubtype }),
    );
    // Offset the clone from the original so it's visibly a separate device
    // rather than stacked exactly on top of it.
    const offsetMm = 300;

    const mount = device.mount;
    if (mount.kind === "wall") {
      const wall = state.walls.find((w) => w.id === mount.wallId);
      const wallLenMm = wall ? Math.hypot(wall.end.x - wall.start.x, wall.end.y - wall.start.y) : mount.offset;
      const newOffset = Math.min(mount.offset + offsetMm, Math.max(0, wallLenMm - 50));
      const clone: ElectricalDevice = {
        ...device,
        id: generateId("device"),
        mount: { ...mount, offset: newOffset },
        number,
      };
      set((s) => ({ devices: [...s.devices, clone], selected: { type: "device", id: clone.id } }));
      return;
    }

    const newPosition = { x: mount.position.x + offsetMm, y: mount.position.y + offsetMm };
    const room = state.rooms.find((r) => isPointInPolygon(newPosition, r.polygon));
    const clone: ElectricalDevice = {
      ...device,
      id: generateId("device"),
      mount: { ...mount, position: newPosition },
      roomId: room?.id ?? device.roomId,
      number,
    };
    set((s) => ({ devices: [...s.devices, clone], selected: { type: "device", id: clone.id } }));
  },

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

  addSmartHomeDeviceAtPoint: (rawPoint) => {
    const state = get();
    const point = applySnap(state, rawPoint);
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
    const { audioZoneId, audioZones: newZones } = resolveAudioZoneAssignment(
      state,
      model,
      undefined,
      room?.id ?? null,
    );

    const device: SmartHomeDevice = {
      id: generateId("smarthome"),
      floorId: state.floorId ?? "",
      systemId: LOXONE_SYSTEM.id,
      modelId: state.smartHomePlacementModelId,
      position: point,
      roomId: room?.id ?? null,
      treeBranchId,
      audioZoneId,
      number,
    };
    set((s) => ({
      smartHomeDevices: [...s.smartHomeDevices, device],
      treeBranches: newBranches,
      audioZones: newZones,
    }));
    return true;
  },

  moveSmartHomeDeviceToPoint: (deviceId, rawPoint) => {
    const state = get();
    const point = applySnap(state, rawPoint);
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
    set((state) => {
      const ref = `smarthome:${id}`;
      return {
        smartHomeDevices: state.smartHomeDevices.filter((device) => device.id !== id),
        treeEdges: state.treeEdges.filter((e) => e.fromRef !== ref && e.toRef !== ref),
        selected: state.selected?.type === "smarthome" && state.selected.id === id
          ? null
          : state.selected,
      };
    }),

  setSmartHomeDeviceModel: (deviceId, modelId) => {
    const state = get();
    const model = findSmartHomeModel(modelId);
    const device = state.smartHomeDevices.find((d) => d.id === deviceId);
    const { treeBranchId, treeBranches } = resolveTreeBranchAssignment(
      state,
      model,
      device?.treeBranchId,
    );
    const { audioZoneId, audioZones } = resolveAudioZoneAssignment(
      state,
      model,
      device?.audioZoneId,
      device?.roomId ?? null,
    );
    set({
      treeBranches,
      audioZones,
      smartHomeDevices: state.smartHomeDevices.map((d) =>
        d.id === deviceId ? { ...d, modelId, treeBranchId, audioZoneId } : d,
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
      state.openings,
    );
    const treeCables = computeTreeBranchCables(
      state.treeBranches,
      state.devices,
      state.smartHomeDevices,
      state.distributionBoard,
      state.walls,
      state.routingMode,
      state.treeJunctions,
      state.treeEdges,
    );
    const audioCables = computeAudioCables(
      state.smartHomeDevices,
      state.audioZones,
      state.distributionBoard,
      state.walls,
      state.speakerCableType,
      state.routingMode,
    );
    const consumerCables = computeConsumerCables(
      state.fixedConsumers,
      state.distributionBoard,
      state.walls,
      state.routingMode,
      state.openings,
    );
    set({ cables: [...starCables, ...treeCables, ...audioCables, ...consumerCables] });
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

// §47 undo/redo history recorder. Runs after every state change; records
// the *previous* slice whenever a structural field actually changed,
// except when the change was itself an undo/redo/floor-swap (guarded by
// isRestoringHistory) — those already carry their own history handling.
useEditorStore.subscribe((state, previousState) => {
  if (isRestoringHistory) return;
  if (!sliceChanged(state, previousState)) return;
  useEditorStore.setState((current) => ({
    history: [...current.history, sliceOf(previousState)].slice(-MAX_HISTORY),
    future: [],
  }));
});

export function roomAreaSqMeters(room: Room): number {
  return polygonAreaSqMeters(room.polygon);
}
