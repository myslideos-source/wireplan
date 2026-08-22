export type AnalysisElementType = "room" | "wall" | "door" | "window" | "stair";

export interface ElementTypeConfidence {
  type: AnalysisElementType;
  label: string;
  count: number;
  confidence: number;
}

export type FlaggedSeverity = "warning" | "critical";

export interface FlaggedArea {
  id: string;
  title: string;
  description: string;
  confidence: number;
  severity: FlaggedSeverity;
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
