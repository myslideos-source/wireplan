export type AnalysisElementType = "room" | "wall" | "door" | "window" | "stair";

export interface ElementTypeConfidence {
  type: AnalysisElementType;
  label: string;
  count: number;
  confidence: number;
}

export type FlaggedSeverity = "warning" | "critical";

/** Which geometry element the Review Mode (Phase 4) should focus and let
 * the user act on — a room zone. Wall/opening targets existed before
 * Phase 11 removed those as modeled entities. */
export interface FlaggedAreaTarget {
  type: "room";
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

/**
 * Result of a real vision-model pass over a user-uploaded plan (Gemini,
 * `/api/analyze-plan`). Deliberately a different, smaller shape than
 * FloorAnalysisResult: a single vision call gives honest counts and a
 * self-reported confidence, but it cannot produce a reviewable digital
 * geometry twin, so flagged areas here carry no room/wall/opening target.
 */
export interface RealAnalysisObservation {
  title: string;
  description: string;
  severity: FlaggedSeverity;
}

export interface RealAnalysisResult {
  fileName: string;
  model: string;
  analyzedAt: string;
  roomsDetected: number;
  wallsCount: number;
  doorsCount: number;
  windowsCount: number;
  stairsCount: number;
  overallConfidence: number;
  elementConfidence: ElementTypeConfidence[];
  observations: RealAnalysisObservation[];
  summary: string;
}

export function confidenceTone(
  confidence: number,
): "success" | "warning" | "error" {
  if (confidence >= 95) return "success";
  if (confidence >= 75) return "warning";
  return "error";
}
