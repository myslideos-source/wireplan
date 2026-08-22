/**
 * Feature flags gate every screen beyond the current build phase (§86).
 * Nothing here fakes a result: a flag being off means the UI shows an
 * honest "coming soon" state instead of a non-functional or fabricated one.
 */
export type FeatureFlag =
  | "AI_PLAN_ANALYSIS"
  | "AI_REVIEW"
  | "ELECTRICAL_EDITOR"
  | "CABLE_ROUTING"
  | "LOXONE"
  | "MATERIAL_CALCULATION"
  | "PDF_EXPORT"
  | "CONSTRUCTION_MODE";

function readFlag(name: string, fallback: boolean): boolean {
  const raw = process.env[`NEXT_PUBLIC_FEATURE_${name}`];
  if (raw === undefined) return fallback;
  return raw === "true" || raw === "1";
}

export const featureFlags: Record<FeatureFlag, boolean> = {
  AI_PLAN_ANALYSIS: readFlag("AI_PLAN_ANALYSIS", false),
  AI_REVIEW: readFlag("AI_REVIEW", false),
  ELECTRICAL_EDITOR: readFlag("ELECTRICAL_EDITOR", false),
  CABLE_ROUTING: readFlag("CABLE_ROUTING", false),
  LOXONE: readFlag("LOXONE", false),
  MATERIAL_CALCULATION: readFlag("MATERIAL_CALCULATION", false),
  PDF_EXPORT: readFlag("PDF_EXPORT", false),
  CONSTRUCTION_MODE: readFlag("CONSTRUCTION_MODE", false),
};

export function isFeatureEnabled(flag: FeatureFlag): boolean {
  return featureFlags[flag];
}

export const PHASE_BY_FLAG: Record<FeatureFlag, number> = {
  AI_PLAN_ANALYSIS: 2,
  AI_REVIEW: 4,
  ELECTRICAL_EDITOR: 5,
  CABLE_ROUTING: 7,
  LOXONE: 8,
  MATERIAL_CALCULATION: 9,
  PDF_EXPORT: 9,
  CONSTRUCTION_MODE: 9,
};
