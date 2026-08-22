export type AnalysisElementType = "room" | "wall" | "door" | "window" | "stair";

export interface ElementTypeConfidence {
  type: AnalysisElementType;
  label: string;
  count: number;
  confidence: number;
}

export type FlaggedSeverity = "warning" | "critical";

/** Which geometry element the Review Mode (Phase 4) should focus and let
 * the user act on — a room, a wall, or a door/window opening. */
export interface FlaggedAreaTarget {
  type: "room" | "wall" | "opening";
  id: string;
}

export interface FlaggedArea {
  id: string;
  title: string;
  description: string;
  confidence: number;
  severity: FlaggedSeverity;
  target?: FlaggedAreaTarget;
}

export interface FloorAnalysisResult {
  projectId: string;
  floorName: string;
  status: "completed";
  roomsDetected: { found: number; expected: number };
  wallsCount: number;
  doorsCount: number;
  windowsCount: number;
  stairsCount: number;
  overallConfidence: number;
  elementConfidence: ElementTypeConfidence[];
  flaggedAreas: FlaggedArea[];
  estimatedReviewMinutes: number;
}

export function confidenceTone(
  confidence: number,
): "success" | "warning" | "error" {
  if (confidence >= 95) return "success";
  if (confidence >= 75) return "warning";
  return "error";
}
