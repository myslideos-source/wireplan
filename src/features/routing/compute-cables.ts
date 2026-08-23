import type {
  Cable,
  CableType,
  DistributionBoard,
  ElectricalDevice,
  ElectricalDeviceType,
  Room,
  RoutingMode,
} from "@/domain";
import { DEVICE_TYPE_LABELS, findSmartHomeModel, NETWORK_DEVICE_CABLE, NETWORK_DEVICE_LABELS } from "@/domain";
import { devicePosition } from "@/features/editor/geometry-utils";

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
 * Cable length estimate (§47-49). The uploaded plan is a locked background
 * image with no wall vectors (Phase 11), so every mode uses the same
 * Manhattan-distance estimate (never straight-line/"Luftlinie", per §47) —
 * an honest approximation of a floor/ceiling/wall-surface run.
 */
export function computeCables(
  devices: ElectricalDevice[],
  board: DistributionBoard,
  rooms: Room[],
  mode: RoutingMode,
): Cable[] {
  const boardPosition = board.position;

  const cables: Cable[] = [];
  let index = 0;
  for (const device of devices) {
    // A Tree device shares its branch's bus cable instead of a home-run
    // (§33) — computeTreeBranchCables accounts for it separately.
    if (device.smartHomeModelId && findSmartHomeModel(device.smartHomeModelId)?.countsAsTreeDevice) {
      continue;
    }
    const position = devicePosition(device);
    index += 1;
    const room = device.roomId ? rooms.find((r) => r.id === device.roomId) : undefined;
    const lengthMeters =
      (Math.abs(position.x - boardPosition.x) + Math.abs(position.y - boardPosition.y)) / 1000;
    cables.push({
      id: `L-${String(index).padStart(3, "0")}`,
      deviceId: device.id,
      type: cableTypeFor(device),
      lengthMeters,
      mode,
      startLabel: "Schaltschrank",
      targetLabel: `${room?.name ?? "Unbekannt"} · ${deviceLabelFor(device)}`,
    });
  }
  return cables;
}
