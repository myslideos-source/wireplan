import type { ElectricalDevice, Room, SmartHomeDevice, TreeBranch } from "@/domain";
import {
  findSmartHomeModel,
  formatDeviceNumber,
  numberingPrefixFor,
  MAX_TREE_DEVICES_PER_BRANCH,
  MAX_TREE_CABLE_LENGTH_M,
} from "@/domain";

export interface PlanWarning {
  id: string;
  message: string;
}

/**
 * The two warnings this phase's data model can honestly support (§45) —
 * a branch past its device or cable-length limit, and a Tree device with
 * no branch assigned. Not the full validation engine from §45's longer
 * list (unrelated checks like "Herd besitzt keine Zuleitung" need domain
 * modeling — fixed consumers, circuits — that doesn't exist yet); adding
 * a warning here without the data to back it would be exactly the kind
 * of invented rule §46 rules out.
 */
export function computeTreeWarnings(
  branches: TreeBranch[],
  devices: ElectricalDevice[],
  smartHomeDevices: SmartHomeDevice[],
  branchLengthsMeters: Record<string, number>,
): PlanWarning[] {
  const warnings: PlanWarning[] = [];
  const countByBranch: Record<string, number> = {};

  for (const device of devices) {
    const model = device.smartHomeModelId ? findSmartHomeModel(device.smartHomeModelId) : undefined;
    if (!model?.countsAsTreeDevice) continue;
    if (!device.treeBranchId) {
      const number = formatDeviceNumber(numberingPrefixFor({ type: device.type }), device.number);
      warnings.push({ id: `unassigned-device-${device.id}`, message: `${number} ist keinem Tree-Ast zugeordnet.` });
      continue;
    }
    countByBranch[device.treeBranchId] = (countByBranch[device.treeBranchId] ?? 0) + 1;
  }

  for (const device of smartHomeDevices) {
    const model = findSmartHomeModel(device.modelId);
    if (!model?.countsAsTreeDevice) continue;
    if (!device.treeBranchId) {
      const number = formatDeviceNumber(
        numberingPrefixFor({ category: model.category, technology: model.technology }),
        device.number,
      );
      warnings.push({ id: `unassigned-device-${device.id}`, message: `${number} ist keinem Tree-Ast zugeordnet.` });
      continue;
    }
    countByBranch[device.treeBranchId] = (countByBranch[device.treeBranchId] ?? 0) + 1;
  }

  for (const branch of branches) {
    const count = countByBranch[branch.id] ?? 0;
    if (count > MAX_TREE_DEVICES_PER_BRANCH) {
      warnings.push({
        id: `overcount-${branch.id}`,
        message: `${branch.label} hat ${count} Geräte — mehr als das Limit von ${MAX_TREE_DEVICES_PER_BRANCH}.`,
      });
    }
    const length = branchLengthsMeters[branch.id] ?? 0;
    if (length > MAX_TREE_CABLE_LENGTH_M) {
      warnings.push({
        id: `overlength-${branch.id}`,
        message: `${branch.label} liegt bei ${length.toFixed(0)} m — mehr als das Limit von ${MAX_TREE_CABLE_LENGTH_M} m.`,
      });
    }
  }

  return warnings;
}

/**
 * §45 — a room that has electrical devices but no circuit assigned yet
 * (`roomCircuits` from the store, editable in the room inspector). Genuine
 * data already tracked for the Kabelliste's "Stromkreise" KPI, just not
 * previously surfaced as an actionable warning.
 */
export function computeCircuitWarnings(
  rooms: Room[],
  devices: ElectricalDevice[],
  roomCircuits: Record<string, string | null>,
): PlanWarning[] {
  const warnings: PlanWarning[] = [];
  const roomIdsWithDevices = new Set(
    devices.map((d) => d.roomId).filter((id): id is string => id !== null),
  );
  for (const roomId of roomIdsWithDevices) {
    if (roomCircuits[roomId]) continue;
    const room = rooms.find((r) => r.id === roomId);
    if (!room) continue;
    warnings.push({
      id: `no-circuit-${roomId}`,
      message: `${room.name} hat Geräte, aber keinen zugewiesenen Stromkreis.`,
    });
  }
  return warnings;
}
