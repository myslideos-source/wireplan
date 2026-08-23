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

/** Assigned in rotation as branches are created (§18) — device category
 * color stays separate from this; this is purely "which branch is this
 * cable" at a glance. */
export const TREE_BRANCH_COLORS = [
  "#68d56b", // green
  "#25b7f2", // turquoise
  "#a78bfa", // violet
  "#e9ba4d", // orange
  "#f472b6", // pink
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
