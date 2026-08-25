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
import { getCircuit } from "@/features/electrical/mock-circuits";
import { orderTreeBusPoints, treeBusLengthMeters, type TreeBusPoint } from "./compute-tree-cables";

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
 * Which loop a device's power-circuit cable belongs to (§Phase15 —
 * "durchschleifen"): devices in a room that has an explicit Stromkreis
 * assigned (the existing room-inspector dropdown) share that circuit's
 * loop even across rooms — the mechanism for manually looping "gewisse
 * Sachen" (a switch/light from elsewhere) in with a room's outlets. A
 * room with no circuit assigned yet still gets its own implicit
 * per-room loop, so outlets in a room chain together immediately,
 * without forcing a circuit assignment first. A device with no room at
 * all forms a loop of one (a plain home-run).
 */
export function circuitGroupKeyFor(
  device: ElectricalDevice,
  roomCircuits: Record<string, string | null>,
): string {
  if (!device.roomId) return `device:${device.id}`;
  const circuitId = roomCircuits[device.roomId];
  return circuitId ? `circuit:${circuitId}` : `room:${device.roomId}`;
}

/**
 * Cable length estimate (§47-49). The uploaded plan is a locked background
 * image with no wall vectors (Phase 11), so every mode uses the same
 * Manhattan-distance estimate (never straight-line/"Luftlinie", per §47) —
 * an honest approximation of a floor/ceiling/wall-surface run.
 *
 * Outlets/lights/switches on the same circuit loop are wired as a real
 * loop-through (§Phase15) — one shared cable hopping board -> device ->
 * device -> ..., not a separate home-run per device, matching how an
 * electrician actually wires a room's sockets. Sensors and network
 * devices stay one home-run each (a different cable type entirely, CAT7,
 * that has no reason to share a power loop).
 */
export function computeCables(
  devices: ElectricalDevice[],
  board: DistributionBoard,
  rooms: Room[],
  mode: RoutingMode,
  roomCircuits: Record<string, string | null> = {},
): Cable[] {
  const boardPosition = board.position;
  const cables: Cable[] = [];
  let index = 0;

  const loopGroups = new Map<string, ElectricalDevice[]>();
  for (const device of devices) {
    // A Tree device shares its branch's bus cable instead (§33) —
    // computeTreeBranchCables accounts for it separately.
    if (device.smartHomeModelId && findSmartHomeModel(device.smartHomeModelId)?.countsAsTreeDevice) {
      continue;
    }
    if (device.type === "sensor" || device.type === "network") {
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
      continue;
    }
    const key = circuitGroupKeyFor(device, roomCircuits);
    const group = loopGroups.get(key);
    if (group) group.push(device);
    else loopGroups.set(key, [device]);
  }

  for (const [key, groupDevices] of loopGroups) {
    const points: TreeBusPoint[] = groupDevices.map((device) => ({
      id: device.id,
      position: devicePosition(device),
    }));
    const ordered = orderTreeBusPoints(boardPosition, points);
    const lengthMeters = treeBusLengthMeters(boardPosition, ordered);

    const roomIds = new Set(groupDevices.map((d) => d.roomId).filter((id): id is string => id !== null));
    const roomNames = [...roomIds].map((id) => rooms.find((r) => r.id === id)?.name ?? "Unbekannt");
    const circuitId = key.startsWith("circuit:") ? key.slice("circuit:".length) : null;
    const circuitLabel = circuitId ? getCircuit(circuitId)?.label : undefined;
    const deviceCountLabel =
      groupDevices.length === 1 ? "1 Gerät" : `${groupDevices.length} Geräte (durchgeschleift)`;
    const targetLabel = circuitLabel
      ? `${circuitLabel} · ${roomNames.join(", ")} · ${deviceCountLabel}`
      : `${roomNames[0] ?? "Unbekannt"} · ${deviceCountLabel}`;

    index += 1;
    cables.push({
      id: `L-${String(index).padStart(3, "0")}`,
      deviceIds: ordered.map((p) => p.id),
      circuitGroupId: key,
      type: "NYM-J 3x1,5",
      lengthMeters,
      mode,
      startLabel: "Schaltschrank",
      targetLabel,
    });
  }

  return cables;
}
