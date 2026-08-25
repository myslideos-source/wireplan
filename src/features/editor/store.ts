"use client";

import { create } from "zustand";
import type {
  Floor,
  Room,
  Point,
  ElectricalDevice,
  ElectricalDeviceType,
  DistributionBoard,
  Cable,
  CableType,
  CableGroup,
  RoutingMode,
  SmartHomeDevice,
  TreeBranch,
  TreeJunction,
  TreeEdge,
  AudioZone,
  FixedConsumer,
  FixedConsumerType,
  NetworkDeviceSubtype,
  Project,
  ProjectKpis,
} from "@/domain";
import {
  polygonAreaSqMeters,
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
  isPointInPolygon,
  floorExtentBox,
  computeSpotArrayPositions,
  polygonCentroid,
  devicePosition,
  type SplitDirection,
  type SpotArrangement,
} from "./geometry-utils";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { fetchFloorsForProject, insertFloor, saveFloorState } from "@/lib/supabase/floors";

export type EditorTool =
  | "select"
  | "room"
  | "outlet"
  | "light"
  | "switch"
  | "sensor"
  | "network"
  | "board"
  | "smarthome"
  | "consumer"
  | "background"
  | "crop"
  | "cable"
  | "junction"
  | "treeConnect";

export type LayerId = "grundriss" | "elektro" | "kabelwege" | "beschriftung" | "hintergrund";

/** §66-71 — focused views that dim everything except one concern, rather
 * than a LayerId toggle (which only shows/hides a whole layer). */
export type ViewMode = "alle" | "tree" | "audio" | "network" | "power";

/** The real, original uploaded plan image — locked and never redrawn
 * (Phase 11). Room zones are drawn directly on top of it by the user;
 * this image is the floor's actual source of truth, not a tracing aid
 * for some other estimated geometry. */
export interface BackgroundImage {
  dataUrl: string;
  x: number;
  y: number;
  width: number;
  height: number;
  aspectRatio: number;
}

/** A freshly-uploaded (not-yet-fitted) plan image. `realWidthMm`, when the
 * user provided it at upload time, is the true real-world width of the
 * depicted floor — used to size the image at actual scale instead of
 * guessing against an arbitrary default box (see `fitBackgroundImage`). */
export interface UploadedBackgroundImage {
  dataUrl: string;
  naturalWidth: number;
  naturalHeight: number;
  realWidthMm?: number;
}

const MIN_BACKGROUND_SIZE_MM = 300;

/** Fits a freshly-uploaded image inside a floor's current extent (drawn
 * room zones, or a sensible default box for a brand-new floor) so it's
 * usable right away instead of appearing off-screen or at the wrong
 * scale. Shared by `setBackgroundImage` (an existing floor) and
 * `addFloor` (a brand-new one, always fitting against the default box
 * since it has no rooms yet).
 *
 * When `realWidthMm` is given (the user told us the plan's true
 * real-world width at upload time), the image is sized at that exact
 * scale instead — without it, a brand-new floor with no rooms yet falls
 * back to the fixed 10m default box, which silently compresses or
 * stretches whatever the photo actually depicts. That mismatch is what
 * previously made room-area math come out wrong and every fixed-size
 * canvas symbol look oversized relative to the (wrongly-scaled) drawing. */
function fitBackgroundImage(
  rooms: Room[],
  dataUrl: string,
  naturalWidth: number,
  naturalHeight: number,
  realWidthMm?: number,
): BackgroundImage {
  const aspectRatio = naturalWidth / naturalHeight;
  if (realWidthMm && realWidthMm > 0) {
    const width = realWidthMm;
    const height = width / aspectRatio;
    return { dataUrl, x: 0, y: 0, width, height, aspectRatio };
  }
  const box = floorExtentBox(rooms, null, 0);
  let width = box.width;
  let height = width / aspectRatio;
  if (height > box.height) {
    height = box.height;
    width = height * aspectRatio;
  }
  const x = box.minX + (box.width - width) / 2;
  const y = box.minY + (box.height - height) / 2;
  return { dataUrl, x, y, width, height, aspectRatio };
}

/** An in-progress crop selection over the current background image, in
 * the same world (mm) coordinates as `BackgroundImage` — always a
 * sub-rectangle of it. Pure in-progress UI state, like
 * `drawingRoomPoints`: reset once the crop is applied or cancelled. */
export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Crops a plan image to the given fraction of its own natural pixel
 * dimensions and returns the result as a new data URL — used so trimming
 * away a title block or margin actually shrinks the image data itself
 * (and every view, including "Original", reflects it), not just what's
 * drawn on top of it. */
function cropImageDataUrl(
  dataUrl: string,
  fraction: { x: number; y: number; width: number; height: number },
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const srcX = fraction.x * img.naturalWidth;
      const srcY = fraction.y * img.naturalHeight;
      const srcW = fraction.width * img.naturalWidth;
      const srcH = fraction.height * img.naturalHeight;
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(srcW));
      canvas.height = Math.max(1, Math.round(srcH));
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas-Kontext nicht verfügbar"));
        return;
      }
      ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => reject(new Error("Bild konnte nicht geladen werden"));
    img.src = dataUrl;
  });
}

export type Selection =
  | { type: "room"; id: string }
  | { type: "device"; id: string }
  | { type: "board" }
  | { type: "smarthome"; id: string }
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

export const DISTRIBUTION_BOARD_ID = "distribution-board";

let nextGeneratedId = 1;
function generateId(prefix: string): string {
  return `${prefix}-gen-${nextGeneratedId++}`;
}

function selectionFromTarget(target: FlaggedAreaTarget | undefined): Selection {
  if (target?.type === "room") return { type: "room", id: target.id };
  return null;
}

/** Everything that's per-floor and independently editable — each floor
 * has its own geometry, devices, Technikraum/Schaltschrank, and cables,
 * so switching floors swaps this whole slice rather than resetting it. */
export interface FloorMutableSlice {
  rooms: Room[];
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
    rooms: geometry.rooms,
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
  "rooms",
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

/**
 * Live per-project totals, aggregated across every floor the user has
 * touched this session (the active floor's top-level fields plus every
 * other floor cached in `floorCache`, per `switchFloor`). The Dashboard/
 * Projects pages otherwise only ever see the static `Project.kpis` they
 * were served with (always zero — there's no persistence layer to update
 * it from), which is exactly why cable lengths and room/device counts
 * looked frozen there no matter how much routing work was actually done
 * in the editor. `floorCache` can still hold a stale copy of the
 * currently active floor (left behind by `switchFloor`, which never
 * deletes the entry it just read from) — excluded here to avoid counting
 * that floor twice.
 */
export function computeLiveProjectKpis(
  state: Pick<EditorState, "floors" | "floorId" | "floorCache"> & FloorMutableSlice,
): ProjectKpis {
  const cachedSlices = Object.entries(state.floorCache)
    .filter(([id]) => id !== state.floorId)
    .map(([, slice]) => slice);
  const slices = state.floorId ? [...cachedSlices, sliceOf(state)] : cachedSlices;

  let rooms = 0;
  let devices = 0;
  let cableLengthMeters = 0;
  const circuitIds = new Set<string>();
  for (const slice of slices) {
    rooms += slice.rooms.length;
    devices += slice.devices.length + slice.smartHomeDevices.length;
    cableLengthMeters += slice.cables.reduce((sum, cable) => sum + cable.lengthMeters, 0);
    for (const value of Object.values(slice.roomCircuits)) {
      if (value) circuitIds.add(value);
    }
  }

  return {
    floors: state.floors.length,
    rooms,
    devices,
    cableLengthMeters,
    circuits: circuitIds.size,
  };
}

/**
 * A project's KPIs, live from the editor store when it's the project
 * currently open there this session, falling back to the static
 * server-supplied `project.kpis` (honest zeros) otherwise — e.g. before
 * the editor has ever been opened, or while looking at a different
 * project than the one loaded in the store.
 *
 * Deliberately selects the whole state object (a stable reference that
 * only changes on an actual `set()`) rather than computing the derived
 * kpis object inside the selector itself — a selector that returns a
 * freshly-built object every call defeats `useSyncExternalStore`'s
 * reference-equality check and can loop ("Maximum update depth exceeded")
 * instead of just re-rendering once.
 */
export function useLiveProjectKpis(project: Project): ProjectKpis {
  const state = useEditorStore((s) => s);
  return state.floors[0]?.floor.projectId === project.id
    ? computeLiveProjectKpis(state)
    : project.kpis;
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
  state: Pick<EditorState, "devices" | "smartHomeDevices" | "treeJunctions" | "distributionBoard">,
  ref: string,
): { position: Point; treeBranchId: string | undefined } | null {
  if (ref === "board") {
    if (!state.distributionBoard) return null;
    return { position: state.distributionBoard.position, treeBranchId: undefined };
  }
  const separatorIndex = ref.indexOf(":");
  if (separatorIndex === -1) return null;
  const kind = ref.slice(0, separatorIndex);
  const id = ref.slice(separatorIndex + 1);
  if (kind === "device") {
    const device = state.devices.find((d) => d.id === id);
    if (!device) return null;
    return { position: devicePosition(device), treeBranchId: device.treeBranchId };
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

/** Reads a multi-select item's current position — devices, standalone
 * Smart-Home devices, and fixed consumers are all point-placed. */
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
  return state.devices.find((d) => d.id === item.id)?.mount.position ?? null;
}

/** Default ceiling height for a manually-drawn room zone (Phase 11) —
 * matches the height this app has always used for AI-estimated rooms. */
const DEFAULT_ROOM_HEIGHT_MM = 2500;
/** Clicking within this distance of the room draw's first vertex closes
 * the polygon instead of adding a near-duplicate point. */
const ROOM_DRAW_CLOSE_THRESHOLD_MM = 250;

const SNAP_GRID_MM = 50;
const SNAP_MAGNET_THRESHOLD_MM = 180;

/** §51 — snapping while placing/dragging a point-mounted item. Magnetism
 * (to another device or a room's center) wins over the grid when the
 * point is close enough to one; otherwise the point snaps to the nearest
 * grid intersection. */
function applySnap(
  state: Pick<EditorState, "snapEnabled" | "devices" | "smartHomeDevices" | "fixedConsumers" | "rooms">,
  point: Point,
): Point {
  if (!state.snapEnabled) return point;

  const candidates: Point[] = [];
  for (const device of state.devices) candidates.push(device.mount.position);
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
  rooms: Room[];
  devices: ElectricalDevice[];
  roomCircuits: Record<string, string | null>;
  technikraumRoomId: string | null;
  distributionBoard: DistributionBoard | null;
  cables: Cable[];
  /** §112 — independent show/hide per wiring group in the Routing view
   * (Tree/Loxone, Lautsprecher, Netzwerk, Steckdosen/Stromkreise), unlike
   * the editor's `viewMode` which is a single-select focus dim rather than
   * a multi-toggle. All four default visible. */
  visibleCableGroups: Record<CableGroup, boolean>;
  toggleCableGroup: (group: CableGroup) => void;
  routingMode: RoutingMode;
  smartHomeDevices: SmartHomeDevice[];
  smartHomePlacementModelId: string;
  backgroundImage: BackgroundImage | null;
  treeBranches: TreeBranch[];
  createTreeBranch: (label?: string) => string;
  deleteTreeBranch: (id: string) => void;
  assignDeviceToTreeBranch: (deviceId: string, branchId: string | null) => void;
  /** §Phase14.2 — bulk-assigns every Tree-capable device on the current
   * floor that has no branch yet, filling existing branches before
   * creating new ones (respecting MAX_TREE_DEVICES_PER_BRANCH); devices
   * with an existing manual assignment are left untouched. Returns the
   * number of devices newly assigned. */
  autoConnectTreeDevicesOnFloor: () => number;

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
  /** Like `hydrate`, but seeds one or more floors' locked background image
   * up front — used by a multi-page plan import (Phase 12) where each
   * detected page becomes its own floor with its own background, before
   * the user has ever visited most of those floors. */
  hydrateWithBackgrounds: (
    geometries: FloorGeometry[],
    backgroundImages: Record<string, UploadedBackgroundImage>,
  ) => void;
  switchFloor: (floorId: string) => void;
  /** Loads every persisted floor (and its full editable content) for a
   * project from Supabase — the client-only floors/devices/etc. this
   * store otherwise only ever holds in memory for the current tab.
   * Returns whether any floors were found (false when no Supabase project
   * is configured, the project has no saved floors yet, or the request
   * fails) — the caller decides what "no floors" means (e.g. show the
   * empty state) rather than this action guessing. */
  hydrateFromSupabase: (projectId: string) => Promise<boolean>;
  /** Adds a brand-new, empty floor to the current project and switches to
   * it — e.g. a second locked-raster floor added from the editor, rather
   * than only the floors a project was hydrated with. Returns the new
   * floor's id. */
  addFloor: (input: {
    name: string;
    level: number;
    backgroundImage?: UploadedBackgroundImage;
  }) => string;
  setBackgroundImage: (dataUrl: string, naturalWidth: number, naturalHeight: number) => void;
  moveBackgroundImageToPoint: (point: Point) => void;
  resizeBackgroundImageToPoint: (point: Point) => void;
  clearBackgroundImage: () => void;

  // Crop the locked background image down to just what's needed (§ "der
  // Plan muss sauber zugeschnitten werden") — a title block or wide
  // margin around the actual drawing can be trimmed away entirely rather
  // than just scaled smaller. Pure in-progress UI state while dragging,
  // like drawingRoomPoints; `applyCrop` is the only step that mutates the
  // real image data.
  cropRect: CropRect | null;
  startCrop: () => void;
  updateCropTopLeft: (point: Point) => void;
  updateCropBottomRight: (point: Point) => void;
  applyCrop: () => Promise<void>;
  cancelCrop: () => void;

  selected: Selection;
  select: (selection: Selection) => void;
  /** Moves the current selection by an exact mm delta, bypassing the snap
   * grid entirely (§109 — mouse-drag placement is grid-snapped for speed,
   * but fine-tuning against a real uploaded plan needs mm precision the
   * 50mm grid can't give). Arrow keys on the canvas call this directly. */
  nudgeSelected: (dx: number, dy: number) => void;

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

  // Manual room-zone drawing (Phase 11) — the plan is a locked background
  // image with no wall geometry, so rooms are polygons the user traces
  // directly, click by click, instead of AI-derived or split/merge-only.
  // Pure in-progress UI state, like treeConnectPendingNodeRef: not part of
  // the undo-tracked FloorMutableSlice.
  drawingRoomPoints: Point[] | null;
  addRoomDrawPoint: (point: Point) => void;
  closeRoomDraw: (name?: string) => boolean;
  cancelRoomDraw: () => void;

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
  /** Adds/removes one cabinet-hardware model from the Schaltschrank's
   * component list (§9/§22) — a cabinet holds a Miniserver *and* a Tree
   * Extension *and* a Netzteil at once, not just one assignment. */
  addCabinetComponent: (modelId: string) => void;
  removeCabinetComponent: (modelId: string) => void;
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
  rooms: [],
  devices: [],
  roomCircuits: {},
  technikraumRoomId: null,
  distributionBoard: null,
  cables: [],
  visibleCableGroups: { tree: true, audio: true, network: true, power: true },
  toggleCableGroup: (group) =>
    set((state) => ({
      visibleCableGroups: { ...state.visibleCableGroups, [group]: !state.visibleCableGroups[group] },
    })),
  routingMode: "Decke",
  smartHomeDevices: [],
  smartHomePlacementModelId:
    LOXONE_CATALOG.find((model) => model.isPlanableOnFloorplan)?.id ?? LOXONE_CATALOG[0].id,
  backgroundImage: null,
  treeBranches: [],
  treeJunctions: [],
  treeEdges: [],
  treeConnectPendingNodeRef: null,
  drawingRoomPoints: null,
  cropRect: null,
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
        mount: { position, height },
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

  autoConnectTreeDevicesOnFloor: () => {
    const state = get();
    let treeBranches = state.treeBranches;
    let devices = state.devices;
    let smartHomeDevices = state.smartHomeDevices;
    let assignedCount = 0;

    for (let i = 0; i < devices.length; i += 1) {
      const device = devices[i];
      if (device.treeBranchId) continue;
      const model = device.smartHomeModelId ? findSmartHomeModel(device.smartHomeModelId) : undefined;
      if (!model?.countsAsTreeDevice) continue;
      const resolved = resolveTreeBranchAssignment(
        { devices, smartHomeDevices, treeBranches, floorId: state.floorId },
        model,
        undefined,
      );
      treeBranches = resolved.treeBranches;
      devices = devices.map((d, idx) => (idx === i ? { ...d, treeBranchId: resolved.treeBranchId } : d));
      assignedCount += 1;
    }

    for (let i = 0; i < smartHomeDevices.length; i += 1) {
      const device = smartHomeDevices[i];
      if (device.treeBranchId) continue;
      const model = findSmartHomeModel(device.modelId);
      if (!model?.countsAsTreeDevice) continue;
      const resolved = resolveTreeBranchAssignment(
        { devices, smartHomeDevices, treeBranches, floorId: state.floorId },
        model,
        undefined,
      );
      treeBranches = resolved.treeBranches;
      smartHomeDevices = smartHomeDevices.map((d, idx) =>
        idx === i ? { ...d, treeBranchId: resolved.treeBranchId } : d,
      );
      assignedCount += 1;
    }

    set({ devices, smartHomeDevices, treeBranches });
    return assignedCount;
  },

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

    // Flush the outgoing floor's last state immediately rather than
    // waiting on the debounced autosave below, which may not have fired
    // yet for an edit made just before switching away.
    if (currentFloorId) {
      const supabase = createSupabaseBrowserClient();
      if (supabase) saveFloorState(supabase, currentFloorId, currentSlice);
    }
  },

  hydrateWithBackgrounds: (geometries, backgroundImages) => {
    const first = geometries[0];
    if (!first) return;
    // Same dedup guard as `hydrate` — a revisit of an already-hydrated
    // project (e.g. navigating away and back) must not wipe in-progress
    // edits by re-seeding from scratch.
    if (get().floors[0]?.floor.projectId === first.floor.projectId) return;
    isRestoringHistory = true;
    function backgroundFor(geometry: FloorGeometry): BackgroundImage | null {
      const raw = backgroundImages[geometry.floor.id];
      if (!raw) return null;
      return fitBackgroundImage(geometry.rooms, raw.dataUrl, raw.naturalWidth, raw.naturalHeight, raw.realWidthMm);
    }
    const floorCache: Record<string, FloorMutableSlice> = {};
    for (const geometry of geometries.slice(1)) {
      const slice = freshSliceFromGeometry(geometry);
      const background = backgroundFor(geometry);
      floorCache[geometry.floor.id] = background ? { ...slice, backgroundImage: background } : slice;
    }
    const firstSlice = freshSliceFromGeometry(first);
    const firstBackground = backgroundFor(first);
    set({
      floors: geometries,
      floorCache,
      floorId: first.floor.id,
      ...firstSlice,
      backgroundImage: firstBackground ?? firstSlice.backgroundImage,
      selected: null,
      history: [],
      future: [],
    });
    isRestoringHistory = false;

    // These floors only ever existed in this draft store until now (the
    // upload-a-plan flow that produces them never goes through `addFloor`)
    // — without this they'd render fine for the current session but never
    // actually reach Supabase, so a later revisit finds no floors at all.
    const supabase = createSupabaseBrowserClient();
    if (supabase) {
      for (const geometry of geometries) {
        const slice = geometry.floor.id === first.floor.id
          ? { ...firstSlice, backgroundImage: firstBackground ?? firstSlice.backgroundImage }
          : floorCache[geometry.floor.id];
        insertFloor(supabase, geometry.floor, slice);
      }
    }
  },

  hydrateFromSupabase: async (projectId) => {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return false;
    const loaded = await fetchFloorsForProject(supabase, projectId);
    if (!loaded || loaded.length === 0) return false;
    // Same dedup guard as `hydrate` — don't clobber in-progress edits if
    // this project's floors are already loaded (e.g. a second gate check
    // firing after the first already hydrated it).
    if (get().floors[0]?.floor.projectId === projectId) return true;

    const geometries: FloorGeometry[] = loaded.map(({ floor, state }) => ({
      floor,
      rooms: state.rooms,
    }));
    const floorCache: Record<string, FloorMutableSlice> = {};
    for (const { floor, state } of loaded.slice(1)) floorCache[floor.id] = state;
    const first = loaded[0];

    isRestoringHistory = true;
    set({
      floors: geometries,
      floorCache,
      floorId: first.floor.id,
      ...first.state,
      selected: null,
      history: [],
      future: [],
    });
    isRestoringHistory = false;
    return true;
  },

  addFloor: ({ name, level, backgroundImage }) => {
    const state = get();
    const projectId = state.floors[0]?.floor.projectId ?? "";
    const floor: Floor = { id: crypto.randomUUID(), projectId, name, level };
    const geometry: FloorGeometry = { floor, rooms: [] };
    const currentFloorId = state.floorId;
    const currentSlice = sliceOf(state);
    const newCache = currentFloorId
      ? { ...state.floorCache, [currentFloorId]: currentSlice }
      : state.floorCache;

    const freshSlice = freshSliceFromGeometry(geometry);
    const seededBackground = backgroundImage
      ? fitBackgroundImage(
          [],
          backgroundImage.dataUrl,
          backgroundImage.naturalWidth,
          backgroundImage.naturalHeight,
          backgroundImage.realWidthMm,
        )
      : null;

    isRestoringHistory = true;
    set({
      floors: [...state.floors, geometry],
      floorCache: newCache,
      floorId: floor.id,
      ...freshSlice,
      backgroundImage: seededBackground,
      selected: null,
      activeTool: "select",
      history: [],
      future: [],
    });
    isRestoringHistory = false;

    // Persist the outgoing floor's last state (autosave's debounce may not
    // have fired yet) plus the brand-new floor row, if Supabase is
    // configured — a no-op fire-and-forget otherwise.
    const supabase = createSupabaseBrowserClient();
    if (supabase) {
      if (currentFloorId) saveFloorState(supabase, currentFloorId, currentSlice);
      insertFloor(supabase, floor, { ...freshSlice, backgroundImage: seededBackground });
    }
    return floor.id;
  },

  selected: null,
  select: (selection) => set({ selected: selection }),

  nudgeSelected: (dx, dy) => {
    const state = get();
    const sel = state.selected;
    if (!sel) return;
    if (sel.type === "device") {
      const device = state.devices.find((d) => d.id === sel.id);
      if (!device) return;
      const point = { x: device.mount.position.x + dx, y: device.mount.position.y + dy };
      const room = state.rooms.find((r) => isPointInPolygon(point, r.polygon));
      set((s) => ({
        devices: s.devices.map((d) =>
          d.id === sel.id
            ? { ...d, mount: { position: point, height: d.mount.height }, roomId: room?.id ?? null }
            : d,
        ),
      }));
    } else if (sel.type === "smarthome") {
      const device = state.smartHomeDevices.find((d) => d.id === sel.id);
      if (!device) return;
      const point = { x: device.position.x + dx, y: device.position.y + dy };
      const room = state.rooms.find((r) => isPointInPolygon(point, r.polygon));
      set((s) => ({
        smartHomeDevices: s.smartHomeDevices.map((d) =>
          d.id === sel.id ? { ...d, position: point, roomId: room?.id ?? null } : d,
        ),
      }));
    } else if (sel.type === "consumer") {
      const consumer = state.fixedConsumers.find((c) => c.id === sel.id);
      if (!consumer) return;
      const point = { x: consumer.position.x + dx, y: consumer.position.y + dy };
      const room = state.rooms.find((r) => isPointInPolygon(point, r.polygon));
      set((s) => ({
        fixedConsumers: s.fixedConsumers.map((c) =>
          c.id === sel.id ? { ...c, position: point, roomId: room?.id ?? null } : c,
        ),
      }));
    } else if (sel.type === "junction") {
      const junction = state.treeJunctions.find((j) => j.id === sel.id);
      if (!junction) return;
      const point = { x: junction.position.x + dx, y: junction.position.y + dy };
      set((s) => ({
        treeJunctions: s.treeJunctions.map((j) => (j.id === sel.id ? { ...j, position: point } : j)),
      }));
    } else if (sel.type === "board" && state.distributionBoard) {
      const point = {
        x: state.distributionBoard.position.x + dx,
        y: state.distributionBoard.position.y + dy,
      };
      get().placeDistributionBoard(point);
    }
  },

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
        if (!device) continue;
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

  // §111 — defaulting this on meant every drag (placing OR repositioning
  // a symbol) always jumped in 50mm steps, with no obvious way to get
  // smooth mm-precise movement short of discovering this toggle. Since
  // fine-tuning symbols against a real uploaded plan is the whole point,
  // free positioning is now the default; snapping stays one click away
  // for anyone who wants quick grid alignment instead.
  snapEnabled: false,
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

  addRoomDrawPoint: (rawPoint) => {
    const state = get();
    const point = applySnap(state, rawPoint);
    const points = state.drawingRoomPoints;
    if (!points) {
      set({ drawingRoomPoints: [point] });
      return;
    }
    if (points.length >= 3) {
      const first = points[0];
      const distance = Math.hypot(point.x - first.x, point.y - first.y);
      if (distance <= ROOM_DRAW_CLOSE_THRESHOLD_MM) {
        get().closeRoomDraw();
        return;
      }
    }
    set({ drawingRoomPoints: [...points, point] });
  },

  closeRoomDraw: (name) => {
    const state = get();
    const points = state.drawingRoomPoints;
    if (!points || points.length < 3) return false;
    const room: Room = {
      id: generateId("room"),
      floorId: state.floorId ?? "",
      name: name ?? `Raum ${state.rooms.length + 1}`,
      type: "Sonstiges",
      polygon: points,
      area: polygonAreaSqMeters(points),
      height: DEFAULT_ROOM_HEIGHT_MM,
    };
    set((s) => ({
      rooms: [...s.rooms, room],
      drawingRoomPoints: null,
      activeTool: "select",
      selected: { type: "room", id: room.id },
    }));
    return true;
  },

  cancelRoomDraw: () => set({ drawingRoomPoints: null }),

  addDeviceAtPoint: (type, rawPoint) => {
    const state = get();
    const height = DEVICE_DEFAULT_HEIGHT[type];
    const networkDeviceSubtype = type === "network" ? state.networkDevicePlacementSubtype : undefined;
    const number = nextNumberForPrefix(state, numberingPrefixFor({ type, networkDeviceSubtype }));
    const point = applySnap(state, rawPoint);

    // No room requirement here (unlike placeDistributionBoard, which
    // genuinely needs a designated Technikraum) — a fresh plan usually has
    // no room zones drawn yet, and a device dropped before that point
    // should still land on the canvas rather than silently doing nothing;
    // roomId just stays null until a room is drawn over it, same as
    // addFixedConsumerAtPoint/addSmartHomeDeviceAtPoint already do.
    const room = state.rooms.find((r) => isPointInPolygon(point, r.polygon));
    const device: ElectricalDevice = {
      id: generateId("device"),
      floorId: state.floorId ?? "",
      type,
      mount: { position: point, height },
      roomId: room?.id ?? null,
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
    const point = applySnap(state, rawPoint);

    const room = state.rooms.find((r) => isPointInPolygon(point, r.polygon));
    set((s) => ({
      devices: s.devices.map((d) =>
        d.id === deviceId
          ? {
              ...d,
              mount: { position: point, height: device.mount.height },
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
    const newPosition = { x: device.mount.position.x + offsetMm, y: device.mount.position.y + offsetMm };
    const room = state.rooms.find((r) => isPointInPolygon(newPosition, r.polygon));
    const clone: ElectricalDevice = {
      ...device,
      id: generateId("device"),
      mount: { ...device.mount, position: newPosition },
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

  addCabinetComponent: (modelId) =>
    set((state) =>
      state.distributionBoard && !state.distributionBoard.cabinetComponentModelIds.includes(modelId)
        ? {
            distributionBoard: {
              ...state.distributionBoard,
              cabinetComponentModelIds: [...state.distributionBoard.cabinetComponentModelIds, modelId],
            },
          }
        : {},
    ),

  removeCabinetComponent: (modelId) =>
    set((state) =>
      state.distributionBoard
        ? {
            distributionBoard: {
              ...state.distributionBoard,
              cabinetComponentModelIds: state.distributionBoard.cabinetComponentModelIds.filter(
                (id) => id !== modelId,
              ),
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

    // Restrict placement to inside the Technikraum's own polygon (§45) —
    // there's no bordering wall to snap to anymore (Phase 11).
    if (!isPointInPolygon(point, technikraum.polygon)) return false;

    const board: DistributionBoard = {
      id: DISTRIBUTION_BOARD_ID,
      floorId: state.floorId ?? "",
      roomId: technikraum.id,
      position: point,
      width: 600,
      height: 800,
      cabinetComponentModelIds: state.distributionBoard?.cabinetComponentModelIds ?? [],
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
    set({ backgroundImage: fitBackgroundImage(state.rooms, dataUrl, naturalWidth, naturalHeight) });
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

  clearBackgroundImage: () => set({ backgroundImage: null, cropRect: null }),

  startCrop: () => {
    const state = get();
    if (!state.backgroundImage) return;
    const { x, y, width, height } = state.backgroundImage;
    set({ activeTool: "crop", cropRect: { x, y, width, height } });
  },

  updateCropTopLeft: (point) =>
    set((state) => {
      const rect = state.cropRect;
      const bg = state.backgroundImage;
      if (!rect || !bg) return {};
      const maxX = rect.x + rect.width - MIN_BACKGROUND_SIZE_MM;
      const maxY = rect.y + rect.height - MIN_BACKGROUND_SIZE_MM;
      const x = Math.min(Math.max(point.x, bg.x), maxX);
      const y = Math.min(Math.max(point.y, bg.y), maxY);
      return { cropRect: { x, y, width: rect.x + rect.width - x, height: rect.y + rect.height - y } };
    }),

  updateCropBottomRight: (point) =>
    set((state) => {
      const rect = state.cropRect;
      const bg = state.backgroundImage;
      if (!rect || !bg) return {};
      const minRight = rect.x + MIN_BACKGROUND_SIZE_MM;
      const minBottom = rect.y + MIN_BACKGROUND_SIZE_MM;
      const right = Math.max(Math.min(point.x, bg.x + bg.width), minRight);
      const bottom = Math.max(Math.min(point.y, bg.y + bg.height), minBottom);
      return { cropRect: { x: rect.x, y: rect.y, width: right - rect.x, height: bottom - rect.y } };
    }),

  cancelCrop: () => set({ cropRect: null, activeTool: "select" }),

  applyCrop: async () => {
    const state = get();
    const bg = state.backgroundImage;
    const rect = state.cropRect;
    if (!bg || !rect) return;
    const croppedDataUrl = await cropImageDataUrl(bg.dataUrl, {
      x: (rect.x - bg.x) / bg.width,
      y: (rect.y - bg.y) / bg.height,
      width: rect.width / bg.width,
      height: rect.height / bg.height,
    });
    set({
      backgroundImage: {
        ...bg,
        dataUrl: croppedDataUrl,
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        aspectRatio: rect.width / rect.height,
      },
      cropRect: null,
      activeTool: "select",
    });
  },

  setRoutingMode: (mode) => set({ routingMode: mode }),

  calculateRouting: () => {
    const state = get();
    if (!state.distributionBoard) return false;
    const starCables = computeCables(
      state.devices,
      state.distributionBoard,
      state.rooms,
      state.routingMode,
      state.roomCircuits,
    );
    const treeCables = computeTreeBranchCables(
      state.treeBranches,
      state.devices,
      state.smartHomeDevices,
      state.distributionBoard,
      state.routingMode,
      state.treeJunctions,
      state.treeEdges,
    );
    const audioCables = computeAudioCables(
      state.smartHomeDevices,
      state.audioZones,
      state.distributionBoard,
      state.speakerCableType,
      state.routingMode,
    );
    const consumerCables = computeConsumerCables(
      state.fixedConsumers,
      state.distributionBoard,
      state.routingMode,
    );
    set({ cables: [...starCables, ...treeCables, ...audioCables, ...consumerCables] });
    return true;
  },

  splitRoom: (roomId, direction, ratio, nameA, nameB) => {
    const room = get().rooms.find((r) => r.id === roomId);
    if (!room || !isAxisAlignedRectangle(room.polygon)) return false;

    const { polyA, polyB } = splitRectangle(room.polygon, direction, ratio);
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

// Autosave — debounced so a burst of edits (dragging a device, typing in
// a field) doesn't fire one Supabase write per intermediate frame.
// `switchFloor`/`addFloor` already flush the outgoing floor's state
// immediately on their own, so this only needs to cover edits made while
// staying on the same floor. A no-op when no Supabase project is
// configured (`createSupabaseBrowserClient` returns null).
let autosaveTimer: ReturnType<typeof setTimeout> | null = null;
useEditorStore.subscribe((state, previousState) => {
  if (isRestoringHistory) return;
  if (!state.floorId || state.floorId !== previousState.floorId) return;
  if (!sliceChanged(state, previousState)) return;
  const floorId = state.floorId;
  const snapshot = sliceOf(state);
  if (autosaveTimer) clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(() => {
    const supabase = createSupabaseBrowserClient();
    if (supabase) saveFloorState(supabase, floorId, snapshot);
  }, 800);
});

export function roomAreaSqMeters(room: Room): number {
  return polygonAreaSqMeters(room.polygon);
}
