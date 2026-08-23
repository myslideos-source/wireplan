/**
 * Cable types used for routing (§49, §54, §28). "Tree Cable" is the
 * shared bus for a Tree branch (§33/§60) — one cable per branch, not one
 * per device, which is why `Cable.deviceId` below is optional. Speaker
 * cabling is its own type (§12) — never assumed to be a Tree cable even
 * when the speaker sits in the same room as Tree hardware. "Leerrohr M25"
 * (§40/§41) is a spare empty conduit run alongside a fixed consumer's
 * lead for future re-cabling — never a substitute for the real lead.
 */
export type CableType =
  | "NYM-J 3x1,5"
  | "NYM-J 3x2,5"
  | "NYM-J 5x2,5"
  | "NYM-J 5x6"
  | "CAT7"
  | "Tree Cable"
  | "Lautsprecherkabel 2x1,5"
  | "Lautsprecherkabel 2x2,5"
  | "Leerrohr M25";

/** The two speaker-cable cross-sections a planner would actually pick
 * from (§12 — "Der Kabeltyp muss konfigurierbar sein"). */
export const SPEAKER_CABLE_TYPES: CableType[] = [
  "Lautsprecherkabel 2x1,5",
  "Lautsprecherkabel 2x2,5",
];

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
