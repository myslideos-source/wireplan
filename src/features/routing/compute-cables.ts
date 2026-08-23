import type {
  Cable,
  CableType,
  DistributionBoard,
  ElectricalDevice,
  ElectricalDeviceType,
  Room,
  RoutingMode,
  Wall,
} from "@/domain";
import { DEVICE_TYPE_LABELS, findSmartHomeModel, NETWORK_DEVICE_CABLE, NETWORK_DEVICE_LABELS } from "@/domain";
import { devicePosition, pointAtOffset } from "@/features/editor/geometry-utils";

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
 * First-pass cable length estimate (§47-49). Real routing would path
 * around walls/openings per the chosen mode (Boden/Decke/Wand/Hybrid);
 * this uses Manhattan distance (never straight-line/"Luftlinie", per
 * §47) as an honest approximation until per-mode pathfinding exists —
 * the mode is recorded on each cable but doesn't yet change the length.
 */
export function computeCables(
  devices: ElectricalDevice[],
  board: DistributionBoard,
  walls: Wall[],
  rooms: Room[],
  mode: RoutingMode,
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
    const lengthMm =
      Math.abs(position.x - boardPosition.x) + Math.abs(position.y - boardPosition.y);
    const room = device.roomId ? rooms.find((r) => r.id === device.roomId) : undefined;
    cables.push({
      id: `L-${String(index).padStart(3, "0")}`,
      deviceId: device.id,
      type: cableTypeFor(device),
      lengthMeters: lengthMm / 1000,
      mode,
      startLabel: "Schaltschrank",
      targetLabel: `${room?.name ?? "Unbekannt"} · ${deviceLabelFor(device)}`,
    });
  }
  return cables;
}
