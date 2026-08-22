import type { FloorAnalysisResult } from "./types";

/**
 * Demo analysis output for the KI-Analyse screen (Phase 2). AI_PLAN_ANALYSIS
 * is off by default — there is no real computer-vision pipeline behind this
 * yet, so the screen must never present this as a live result (§85). The
 * page that renders this always shows a "Demo-Daten" banner alongside it.
 *
 * The numbers themselves are the worked example from the product spec
 * (§13–17, §28–29): 8/8 rooms, 34 walls, 11 doors, 14 windows, 1 stair,
 * 92% overall confidence, 4 flagged areas needing ~2 minutes of review.
 */
const MOCK_ANALYSES: Record<string, FloorAnalysisResult> = {
  "proj-mustermann": {
    projectId: "proj-mustermann",
    floorName: "Erdgeschoss",
    status: "completed",
    roomsDetected: { found: 8, expected: 8 },
    wallsCount: 34,
    doorsCount: 11,
    windowsCount: 14,
    stairsCount: 1,
    overallConfidence: 92,
    elementConfidence: [
      { type: "room", label: "Raum", count: 8, confidence: 98 },
      { type: "wall", label: "Wand", count: 34, confidence: 96 },
      { type: "door", label: "Tür", count: 11, confidence: 87 },
      { type: "window", label: "Fenster", count: 14, confidence: 91 },
    ],
    estimatedReviewMinutes: 2,
    flaggedAreas: [
      {
        id: "flag-1",
        title: "Raumaufteilung unsicher",
        description:
          "Wir sind uns bei dieser Raumaufteilung nicht sicher. Prüfen Sie, ob hier eine Trennwand fehlt.",
        confidence: 68,
        severity: "critical",
        target: { type: "room", id: "room-zimmer2" },
      },
      {
        id: "flag-2",
        title: "Flächenabweichung Bad",
        description:
          "OCR erkennt 8,84 m² auf dem Originalplan, unsere Geometrie berechnet einen abweichenden Wert. Bitte prüfen.",
        confidence: 82,
        severity: "warning",
        target: { type: "room", id: "room-bad" },
      },
      {
        id: "flag-3",
        title: "Maßabweichung Wand",
        description:
          "Bemaßung im Originalplan: 3,40 m. Bitte mit der digitalen Wandlänge abgleichen.",
        confidence: 79,
        severity: "warning",
        target: { type: "wall", id: "w8" },
      },
      {
        id: "flag-4",
        title: "Tür unklar erkannt",
        description:
          "Die Türposition zwischen Flur und Bad konnte nicht eindeutig zugeordnet werden.",
        confidence: 71,
        severity: "critical",
        target: { type: "opening", id: "d4" },
      },
    ],
  },
};

export async function getAnalysisForProject(
  projectId: string,
): Promise<FloorAnalysisResult | undefined> {
  return MOCK_ANALYSES[projectId];
}
