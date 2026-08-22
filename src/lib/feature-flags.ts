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

function isOn(raw: string | undefined, defaultValue = false): boolean {
  if (raw === undefined) return defaultValue;
  return raw === "true" || raw === "1";
}

// Next.js only inlines NEXT_PUBLIC_* env vars into the client bundle when
// they're accessed as a literal `process.env.NEXT_PUBLIC_X` expression —
// a dynamic/computed key is invisible to its compiler and would silently
// read as undefined in the browser. Each flag is therefore spelled out
// literally here rather than looked up in a loop.
export const featureFlags: Record<FeatureFlag, boolean> = {
  // The Phase 2 KI-Analyse screen (original-vs-digital compare, confidence
  // sidebar) is implemented against demo data, so this defaults on — the
  // screen itself always discloses that it's demo data, not a real result.
  AI_PLAN_ANALYSIS: isOn(process.env.NEXT_PUBLIC_FEATURE_AI_PLAN_ANALYSIS, true),
  // The Phase 4 interactive review tools (split/merge rooms, wall
  // correction, delete opening) are implemented, so this defaults on —
  // unlike the flags below, which still gate genuinely unbuilt phases.
  AI_REVIEW: isOn(process.env.NEXT_PUBLIC_FEATURE_AI_REVIEW, true),
  // Phase 5 (placing outlets/lights/switches/sensors/network devices,
  // per-room circuit assignment) is implemented, so this also defaults on.
  ELECTRICAL_EDITOR: isOn(process.env.NEXT_PUBLIC_FEATURE_ELECTRICAL_EDITOR, true),
  CABLE_ROUTING: isOn(process.env.NEXT_PUBLIC_FEATURE_CABLE_ROUTING),
  // Phase 8 (Loxone hardware catalog: assigning devices/board to real
  // Tree/Air models, plus standalone placement) is implemented.
  LOXONE: isOn(process.env.NEXT_PUBLIC_FEATURE_LOXONE, true),
  MATERIAL_CALCULATION: isOn(process.env.NEXT_PUBLIC_FEATURE_MATERIAL_CALCULATION),
  PDF_EXPORT: isOn(process.env.NEXT_PUBLIC_FEATURE_PDF_EXPORT),
  CONSTRUCTION_MODE: isOn(process.env.NEXT_PUBLIC_FEATURE_CONSTRUCTION_MODE),
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
