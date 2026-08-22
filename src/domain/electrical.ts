import type { Point } from "./geometry";

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
}
