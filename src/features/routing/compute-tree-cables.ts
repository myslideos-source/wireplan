import type {
  Cable,
  DistributionBoard,
  ElectricalDevice,
  Point,
  RoutingMode,
  SmartHomeDevice,
  TreeBranch,
  TreeEdge,
  TreeJunction,
} from "@/domain";
import { findSmartHomeModel } from "@/domain";
import { devicePosition } from "@/features/editor/geometry-utils";

export interface TreeBusPoint {
  id: string;
  position: Point;
}

/**
 * Nearest-neighbor bus ordering — starting from the distribution board,
 * repeatedly walk to whichever remaining device is closest. This is a
 * real bus (every hop is device-to-device, not device-to-board like a
 * star). The plan has no wall vectors to route around (Phase 11), so
 * every hop is a plain Manhattan distance — this is the final, permanent
 * routing model for Tree branches, not an interim approximation.
 */
export function orderTreeBusPoints(start: Point, points: TreeBusPoint[]): TreeBusPoint[] {
  const remaining = [...points];
  const ordered: TreeBusPoint[] = [];
  let current = start;
  while (remaining.length > 0) {
    let nearestIndex = 0;
    let nearestDistance = Infinity;
    remaining.forEach((point, index) => {
      const distance = Math.abs(point.position.x - current.x) + Math.abs(point.position.y - current.y);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = index;
      }
    });
    const [next] = remaining.splice(nearestIndex, 1);
    ordered.push(next);
    current = next.position;
  }
  return ordered;
}

export function treeBusLengthMeters(start: Point, orderedPoints: TreeBusPoint[]): number {
  let lengthMm = 0;
  let current = start;
  for (const point of orderedPoints) {
    lengthMm += Math.abs(point.position.x - current.x) + Math.abs(point.position.y - current.y);
    current = point.position;
  }
  return lengthMm / 1000;
}

function treeBusPointsForBranch(
  branch: TreeBranch,
  devices: ElectricalDevice[],
  smartHomeDevices: SmartHomeDevice[],
): TreeBusPoint[] {
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
  return points;
}

/** §61 — resolves a tagged Tree node reference to a world position, for
 * turning a manually-drawn edge into an actual length. Mirrors
 * `resolveTreeNodeRef` in the editor store but stays a pure function here
 * since routing computations don't touch the store directly. */
function positionForRef(
  ref: string,
  boardPosition: Point,
  devices: ElectricalDevice[],
  smartHomeDevices: SmartHomeDevice[],
  treeJunctions: TreeJunction[],
): Point | null {
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

/**
 * One shared bus cable per Tree branch (§33/§60) — the real correctness
 * fix over treating every Tree device as its own star home-run. Branches
 * with no devices yet are skipped rather than producing a zero-length
 * cable. A branch with any manually-drawn edges (§61) uses their real
 * graph length instead of the automatic nearest-neighbor chain — a
 * genuine Y/T-shaped Tree topology, not just a relabeled straight run.
 */
export function computeTreeBranchCables(
  branches: TreeBranch[],
  devices: ElectricalDevice[],
  smartHomeDevices: SmartHomeDevice[],
  board: DistributionBoard,
  mode: RoutingMode,
  treeJunctions: TreeJunction[] = [],
  treeEdges: TreeEdge[] = [],
): Cable[] {
  const boardPosition = board.position;

  const cables: Cable[] = [];
  for (const branch of branches) {
    const points = treeBusPointsForBranch(branch, devices, smartHomeDevices);
    const branchEdges = treeEdges.filter((e) => e.treeBranchId === branch.id);

    if (branchEdges.length > 0) {
      let lengthMeters = 0;
      for (const edge of branchEdges) {
        const from = positionForRef(edge.fromRef, boardPosition, devices, smartHomeDevices, treeJunctions);
        const to = positionForRef(edge.toRef, boardPosition, devices, smartHomeDevices, treeJunctions);
        if (!from || !to) continue;
        lengthMeters += (Math.abs(to.x - from.x) + Math.abs(to.y - from.y)) / 1000;
      }
      cables.push({
        id: `TREE-${branch.id}`,
        treeBranchId: branch.id,
        type: "Tree Cable",
        lengthMeters,
        mode,
        startLabel: "Schaltschrank",
        targetLabel: `${branch.label} · ${points.length} Geräte (manuell verbunden)`,
      });
      continue;
    }

    if (points.length === 0) continue;
    const ordered = orderTreeBusPoints(boardPosition, points);
    const lengthMeters = treeBusLengthMeters(boardPosition, ordered);
    cables.push({
      id: `TREE-${branch.id}`,
      treeBranchId: branch.id,
      type: "Tree Cable",
      lengthMeters,
      mode,
      startLabel: "Schaltschrank",
      targetLabel: `${branch.label} · ${points.length} Geräte`,
    });
  }
  return cables;
}
