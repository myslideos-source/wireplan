import type {
  Cable,
  CableType,
  DistributionBoard,
  ElectricalDevice,
  ElectricalDeviceType,
  Opening,
  Point,
  Room,
  RoutingMode,
  Wall,
} from "@/domain";
import { DEVICE_TYPE_LABELS, findSmartHomeModel, NETWORK_DEVICE_CABLE, NETWORK_DEVICE_LABELS } from "@/domain";
import { devicePosition, pointAtOffset } from "@/features/editor/geometry-utils";
import { findWallAwarePath } from "./pathfind";

const CABLE_TYPE_BY_DEVICE: Record<Exclude<ElectricalDeviceType, "network">, CableType> = {
  outlet: "NYM-J 3x1,5",
  light: "NYM-J 3x1,5",
  switch: "NYM-J 3x1,5",
  sensor: "CAT7",
};

/** §13 — a network device's cable type depends on its subtype (Dose vs.
 * Access Point/Kamera getting a duplex run), not just the generic type. */
function cableTypeFor(device: ElectricalDevice): CableType {
  if (device.type === "network") return NETWORK_DEVICE_CABLE[device.networkDeviceSubtype ?? "dose"];
  return CABLE_TYPE_BY_DEVICE[device.type];
}

function deviceLabelFor(device: ElectricalDevice): string {
  if (device.type === "network") return NETWORK_DEVICE_LABELS[device.networkDeviceSubtype ?? "dose"];
  return DEVICE_TYPE_LABELS[device.type];
}

/**
 * Cable length estimate (§47-49). "Wand" mode uses real wall/door-aware
 * pathfinding (§16/§31, see pathfind.ts) since a surface-mounted cable
 * genuinely cannot cross a wall except through a doorway. The other
 * modes (Boden/Decke/Hybrid) assume the cable runs under the floor or
 * above the ceiling, which can pass under/over any wall — Manhattan
 * distance (never straight-line/"Luftlinie", per §47) is an honest
 * approximation for those.
 */
export function computeCables(
  devices: ElectricalDevice[],
  board: DistributionBoard,
  walls: Wall[],
  rooms: Room[],
  mode: RoutingMode,
  openings: Opening[] = [],
): Cable[] {
  const boardWall = walls.find((w) => w.id === board.wallId);
  if (!boardWall) return [];
  const boardPosition = pointAtOffset(boardWall, board.offset);

  const cables: Cable[] = [];
  let index = 0;
  for (const device of devices) {
    // A Tree device shares its branch's bus cable instead of a home-run
    // (§33) — computeTreeBranchCables accounts for it separately.
    if (device.smartHomeModelId && findSmartHomeModel(device.smartHomeModelId)?.countsAsTreeDevice) {
      continue;
    }
    const position = devicePosition(device, walls);
    if (!position) continue;
    index += 1;
    const room = device.roomId ? rooms.find((r) => r.id === device.roomId) : undefined;
    let lengthMeters: number;
    let path: Point[] | undefined;
    if (mode === "Wand") {
      const routed = findWallAwarePath(boardPosition, position, walls, openings);
      lengthMeters = routed.lengthMm / 1000;
      path = routed.path;
    } else {
      lengthMeters =
        (Math.abs(position.x - boardPosition.x) + Math.abs(position.y - boardPosition.y)) / 1000;
    }
    cables.push({
      id: `L-${String(index).padStart(3, "0")}`,
      deviceId: device.id,
      type: cableTypeFor(device),
      lengthMeters,
      mode,
      startLabel: "Schaltschrank",
      targetLabel: `${room?.name ?? "Unbekannt"} · ${deviceLabelFor(device)}`,
      path,
    });
  }
  return cables;
}
