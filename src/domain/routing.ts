/**
 * Cable types used for the first routing pass (§49, §54). Loxone Tree /
 * Bus cabling is Phase 8 territory once real Loxone device assignment
 * exists — everything placeable today is either 230V power or data.
 */
export type CableType = "NYM-J 3x1,5" | "CAT7";

/** §48 — how the cable run is assumed to travel. Recorded per calculation
 * run; the length estimate itself doesn't yet vary by mode (see
 * computeCables), so switching this is informative, not decorative, once
 * real per-mode pathfinding lands. */
export type RoutingMode = "Boden" | "Decke" | "Wand" | "Hybrid";

export interface Cable {
  id: string;
  deviceId: string;
  type: CableType;
  lengthMeters: number;
  mode: RoutingMode;
  startLabel: string;
  targetLabel: string;
}
