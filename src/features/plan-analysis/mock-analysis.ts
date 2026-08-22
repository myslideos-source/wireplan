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
      },
      {
        id: "flag-2",
        title: "Flächenabweichung HAR/HWR",
        description:
          "OCR erkennt 8,84 m², Geometrie berechnet 8,13 m² – Abweichung 8,0 %. Bitte prüfen.",
        confidence: 82,
        severity: "warning",
      },
      {
        id: "flag-3",
        title: "Maßabweichung Wand",
        description:
          "Bemaßung im Originalplan: 3,40 m, digitale Wandlänge: 3,26 m.",
        confidence: 79,
        severity: "warning",
      },
      {
        id: "flag-4",
        title: "Tür unklar erkannt",
        description:
          "Die Türposition an der Ostwand konnte nicht eindeutig zugeordnet werden.",
        confidence: 71,
        severity: "critical",
      },
    ],
  },
};

export async function getAnalysisForProject(
  projectId: string,
): Promise<FloorAnalysisResult | undefined> {
  return MOCK_ANALYSES[projectId];
}
