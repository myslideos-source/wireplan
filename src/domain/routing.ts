/**
 * Cable types used for routing (§49, §54, §28). "Tree Cable" is the
 * shared bus for a Tree branch (§33/§60) — one cable per branch, not one
 * per device, which is why `Cable.deviceId` below is optional.
 */
export type CableType = "NYM-J 3x1,5" | "CAT7" | "Tree Cable";

/** §48 — how the cable run is assumed to travel. Recorded per calculation
 * run; the length estimate itself doesn't yet vary by mode (see
 * computeCables), so switching this is informative, not decorative, once
 * real per-mode pathfinding lands. */
export type RoutingMode = "Boden" | "Decke" | "Wand" | "Hybrid";

export interface Cable {
  id: string;
  /** Present for a classic star/home-run cable (one device, one cable).
   * Absent for a Tree bus cable, which serves an entire branch instead —
   * see `treeBranchId`. */
  deviceId?: string;
  /** Present for a Tree bus cable — which branch it carries. */
  treeBranchId?: string;
  type: CableType;
  lengthMeters: number;
  mode: RoutingMode;
  startLabel: string;
  targetLabel: string;
}
