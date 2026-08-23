import type { Point } from "./geometry";
import type { SmartHomeDeviceCategory, SmartHomeTechnology } from "./smarthome";

/**
 * The five placeable device categories from the editor toolbar (§35).
 * The fuller symbol library in §39 (Doppelsteckdose, Spot, Taster, ...)
 * is a future refinement of these same categories, not a separate model.
 */
export type ElectricalDeviceType =
  | "outlet"
  | "light"
  | "switch"
  | "sensor"
  | "network";

/** Wall-mounted devices follow a wall by offset (§66), like doors/windows.
 * Point-mounted devices (ceiling lights, sensors) sit at a fixed plan
 * position instead. */
export type DeviceMount =
  | { kind: "wall"; wallId: string; offset: number; height: number }
  | { kind: "point"; position: Point; height: number };

export interface ElectricalDevice {
  id: string;
  floorId: string;
  type: ElectricalDeviceType;
  mount: DeviceMount;
  /** Which room this device counts toward for circuit/wattage totals. */
  roomId: string | null;
  /** Which Loxone (or other smart-home system) hardware realizes this
   * device, if any — references a SmartHomeDeviceModel id. */
  smartHomeModelId?: string;
  /** Which Tree branch this device's Tree bus cable belongs to — only
   * meaningful when the assigned smart-home model is a Tree device. */
  treeBranchId?: string;
  /** Auto-assigned display number (§26), unique per prefix per floor —
   * e.g. the 2nd Touch on a floor gets number 2, shown as "T02". */
  number: number;
}

export const DEVICE_TYPE_LABELS: Record<ElectricalDeviceType, string> = {
  outlet: "Steckdose",
  light: "Lichtpunkt",
  switch: "Schalter",
  sensor: "Sensor",
  network: "Netzwerk",
};

/** Whether a device type mounts to a wall or floats at a point (ceiling). */
export const DEVICE_MOUNT_KIND: Record<ElectricalDeviceType, DeviceMount["kind"]> = {
  outlet: "wall",
  switch: "wall",
  network: "wall",
  light: "point",
  sensor: "point",
};

/** Typical mounting height in mm — outlets/switches/network at working
 * height, lights/sensors at the room ceiling. */
export const DEVICE_DEFAULT_HEIGHT: Record<ElectricalDeviceType, number> = {
  outlet: 300,
  switch: 1050,
  network: 300,
  light: 2700,
  sensor: 2700,
};

/**
 * Illustrative simultaneity-adjusted load per device, in watts — used to
 * compute a room's "Leistung gesamt" (§41). Not a substitute for a real
 * electrical load calculation, but a genuine sum over placed devices
 * rather than a fabricated number.
 */
export const DEVICE_WATTAGE: Record<ElectricalDeviceType, number> = {
  outlet: 200,
  switch: 0,
  network: 0,
  light: 60,
  sensor: 2,
};

/** Auto-numbering label prefixes (§26) — kept as one lookup instead of
 * scattered per-component logic, so a device always gets the same prefix
 * regardless of where it's placed from (toolbar click, drag-drop, or the
 * standalone Smart-Home tool). */
export const ELECTRICAL_TYPE_PREFIX: Record<ElectricalDeviceType, string> = {
  outlet: "SD",
  light: "S",
  switch: "T",
  sensor: "P",
  network: "LAN",
};

export const SMART_HOME_CATEGORY_PREFIX: Record<SmartHomeDeviceCategory, string> = {
  controller: "MS",
  actuator: "S",
  input: "T",
  sensor: "P",
  climate: "P",
};

/** Resolves the display prefix for a device: a Loxone model's technology
 * and category take priority over the generic electrical type (an Air
 * window contact is "FK", not "P", even though its category is "sensor"),
 * falling back to the plain electrical-type prefix when no smart-home
 * model is assigned. */
export function numberingPrefixFor(params: {
  type?: ElectricalDeviceType;
  category?: SmartHomeDeviceCategory;
  technology?: SmartHomeTechnology;
}): string {
  if (params.technology === "audio") return "SPK";
  if (params.technology === "loxone-air" && params.category === "sensor") return "FK";
  if (params.category) return SMART_HOME_CATEGORY_PREFIX[params.category];
  if (params.type) return ELECTRICAL_TYPE_PREFIX[params.type];
  return "G";
}

/** "T02", "P01", ... (§26) — the display number used in the inspector,
 * warnings, and list views alike. */
export function formatDeviceNumber(prefix: string, number: number): string {
  return `${prefix}${String(number).padStart(2, "0")}`;
}

/** A single circuit breaker a room's devices can be assigned to (§41). */
export interface Circuit {
  id: string;
  label: string;
  rcd: string;
}

/**
 * The distribution board / Loxone Miniserver enclosure (§45-46). Wall-
 * mounted like a device, but it's a fixture rather than a placeable tool
 * category, and every cable route (Phase 7) starts from it.
 */
export interface DistributionBoard {
  id: string;
  floorId: string;
  roomId: string;
  wallId: string;
  offset: number;
  width: number;
  height: number;
  /** Which Loxone (or other smart-home system) controller hardware sits
   * in this enclosure, if assigned — references a SmartHomeDeviceModel id. */
  smartHomeModelId?: string;
}
