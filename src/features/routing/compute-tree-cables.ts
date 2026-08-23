import type {
  Cable,
  DistributionBoard,
  ElectricalDevice,
  Point,
  RoutingMode,
  SmartHomeDevice,
  TreeBranch,
  Wall,
} from "@/domain";
import { findSmartHomeModel } from "@/domain";
import { devicePosition, pointAtOffset } from "@/features/editor/geometry-utils";

export interface TreeBusPoint {
  id: string;
  position: Point;
}

/**
 * Nearest-neighbor bus ordering — starting from the distribution board,
 * repeatedly walk to whichever remaining device is closest. This is a
 * real bus (every hop is device-to-device, not device-to-board like a
 * star), just not yet wall/door-aware pathfinding — that's real routing
 * work deferred to a later phase (§16/§31).
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
  walls: Wall[],
): TreeBusPoint[] {
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
  return points;
}

/**
 * One shared bus cable per Tree branch (§33/§60) — the real correctness
 * fix over treating every Tree device as its own star home-run. Branches
 * with no devices yet are skipped rather than producing a zero-length
 * cable.
 */
export function computeTreeBranchCables(
  branches: TreeBranch[],
  devices: ElectricalDevice[],
  smartHomeDevices: SmartHomeDevice[],
  board: DistributionBoard,
  walls: Wall[],
  mode: RoutingMode,
): Cable[] {
  const boardWall = walls.find((w) => w.id === board.wallId);
  if (!boardWall) return [];
  const boardPosition = pointAtOffset(boardWall, board.offset);

  const cables: Cable[] = [];
  for (const branch of branches) {
    const points = treeBusPointsForBranch(branch, devices, smartHomeDevices, walls);
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
