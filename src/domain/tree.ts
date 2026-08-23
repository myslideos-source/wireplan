import type { Point } from "./geometry";

/**
 * Loxone Tree branch/bus modeling (§14/§17/§60/§62). A Tree branch is a
 * shared bus, not a star — every device on it shares the same physical
 * Tree cable back toward the distribution board, so the branch (not the
 * individual device) is what carries a device-count and cable-length
 * limit. These limits are Loxone hardware limits, not app conventions —
 * kept as named constants here (not scattered through the UI) so a
 * future firmware/generation change is a one-line edit (§14).
 */
export const MAX_TREE_DEVICES_PER_BRANCH = 50;
export const MAX_TREE_CABLE_LENGTH_M = 500;

export interface TreeBranch {
  id: string;
  floorId: string;
  label: string;
  colorHex: string;
}

/**
 * A manual branch/junction point on a Tree bus (§61) — real Tree
 * installations aren't always a single daisy chain; an installer often
 * splits the bus at a junction box into two separate runs. A junction is
 * placeable like any point-mounted device and belongs to exactly one
 * branch, same as a Tree device.
 */
export interface TreeJunction {
  id: string;
  floorId: string;
  treeBranchId: string;
  position: Point;
}

/**
 * A manually-drawn bus segment between two Tree nodes (§61) — lets a
 * branch's topology be a real graph (e.g. a junction feeding two
 * separate device chains) instead of always being the single
 * nearest-neighbor chain `orderTreeBusPoints` produces. `fromRef`/
 * `toRef` are tagged node references: `"board"`, `"device:<id>"`,
 * `"smarthome:<id>"`, or `"junction:<id>"`. A branch with no edges keeps
 * using the automatic nearest-neighbor ordering — this is additive, not
 * a replacement the user is forced into.
 */
export interface TreeEdge {
  id: string;
  treeBranchId: string;
  fromRef: string;
  toRef: string;
}

/** Assigned in rotation as branches are created (§18) — device category
 * color stays separate from this; this is purely "which branch is this
 * cable" at a glance. */
export const TREE_BRANCH_COLORS = [
  "#7A9D6E", // green
  "#4A8FA8", // turquoise
  "#8F6FB8", // violet
  "#D9A441", // orange
  "#B8698A", // pink
];

export function nextTreeBranchColor(existingBranches: TreeBranch[]): string {
  return TREE_BRANCH_COLORS[existingBranches.length % TREE_BRANCH_COLORS.length];
}

export type TreeBranchStatus = "green" | "yellow" | "red";

/** Yellow from 80% of either limit, red at/over 100% of either — mirrors
 * §17's worked examples (34/50 green, 46/50 yellow, 50/50 red). */
export function treeBranchStatus(deviceCount: number, cableLengthM: number): TreeBranchStatus {
  const deviceRatio = deviceCount / MAX_TREE_DEVICES_PER_BRANCH;
  const lengthRatio = cableLengthM / MAX_TREE_CABLE_LENGTH_M;
  const ratio = Math.max(deviceRatio, lengthRatio);
  if (ratio >= 1) return "red";
  if (ratio >= 0.8) return "yellow";
  return "green";
}

export const TREE_BRANCH_STATUS_LABELS: Record<TreeBranchStatus, string> = {
  green: "Grün",
  yellow: "Gelb",
  red: "Rot",
};
