/**
 * Cable types used for routing (§49, §54, §28). "Tree Cable" is the
 * shared bus for a Tree branch (§33/§60) — one cable per branch, not one
 * per device, which is why `Cable.deviceId` below is optional. Speaker
 * cabling is its own type (§12) — never assumed to be a Tree cable even
 * when the speaker sits in the same room as Tree hardware. "Leerrohr M25"
 * (§40/§41) is a spare empty conduit run alongside a fixed consumer's
 * lead for future re-cabling — never a substitute for the real lead.
 * "CAT7 Duplex" (§13) is a doubled data run for Access Points/Kameras
 * that need a second path (redundancy or a future device) already in
 * the wall, never used for a plain Netzwerkdose.
 */
export type CableType =
  | "NYM-J 3x1,5"
  | "NYM-J 3x2,5"
  | "NYM-J 5x1,5"
  | "NYM-J 5x2,5"
  | "NYM-J 5x6"
  | "CAT7"
  | "CAT7 Duplex"
  | "Tree Cable"
  | "24V-Leitung"
  | "Lautsprecherkabel 2x1,5"
  | "Lautsprecherkabel 2x2,5"
  | "Leerrohr M25"
  | "Außenkabel (NYY)";

/** The two speaker-cable cross-sections a planner would actually pick
 * from (§12 — "Der Kabeltyp muss konfigurierbar sein"). */
export const SPEAKER_CABLE_TYPES: CableType[] = [
  "Lautsprecherkabel 2x1,5",
  "Lautsprecherkabel 2x2,5",
];

/** §48 — how the cable run is assumed to travel. The uploaded plan is a
 * locked background image with no wall vectors (Phase 11), so every mode
 * uses the same Manhattan-distance estimate — the modes differ only in
 * labeling/intent (floor vs. ceiling vs. a mix), not in computed length. */
export type RoutingMode = "Boden" | "Decke" | "Hybrid";

/** §112 — which of the four independently show/hide-able wiring groups a
 * cable belongs to, for the Routing view's group toggle. "network" also
 * covers sensor home-runs (CAT7, same never-looped wiring rule as a real
 * network dose) — deliberately not split further, since the toggle is
 * about wiring *behavior*, not the exact device type. */
export type CableGroup = "tree" | "audio" | "network" | "power";

export interface Cable {
  id: string;
  kind: CableGroup;
  /** Present for a single-device star/home-run cable (a sensor or network
   * Dose, still one cable per device). Absent for a Tree bus cable or a
   * room circuit loop, which both serve several devices on one shared
   * cable instead — see `treeBranchId`/`deviceIds`. */
  deviceId?: string;
  /** Present for a Tree bus cable — which branch it carries. */
  treeBranchId?: string;
  /** Present for a room-circuit loop cable (§Phase15 — outlets/lights/
   * switches on the same circuit are looped through/"durchgeschleift"
   * from one device to the next instead of each getting its own home-run)
   * — every device the shared cable passes through, in bus order from the
   * board. */
  deviceIds?: string[];
  /** Present alongside `deviceIds` — the grouping key the loop was formed
   * from (an assigned Circuit id, or a synthetic per-room key when the
   * room has no circuit assigned yet). */
  circuitGroupId?: string;
  type: CableType;
  lengthMeters: number;
  mode: RoutingMode;
  startLabel: string;
  targetLabel: string;
}
