import type { GeometryStatus } from "./geometry";

export type ProjectStageId =
  | "upload"
  | "analyze"
  | "validate"
  | "electrical"
  | "routing"
  | "export";

export interface ProjectStage {
  id: ProjectStageId;
  label: string;
  status: "done" | "active" | "pending";
}

export interface ProjectKpis {
  floors: number;
  rooms: number;
  devices: number;
  cableLengthMeters: number;
  circuits: number;
}

export interface Project {
  id: string;
  name: string;
  address: string;
  thumbnailUrl?: string;
  geometryStatus: GeometryStatus;
  stages: ProjectStage[];
  kpis: ProjectKpis;
  updatedAt: string;
}

export const PROJECT_STAGE_LABELS: Record<ProjectStageId, string> = {
  upload: "Grundriss hochladen",
  analyze: "Analysieren",
  validate: "Validieren",
  electrical: "Elektroplanung",
  routing: "Routing",
  export: "Export",
};

/** Every new project starts here — shared by the mock seed data, the
 * client-side projects store, and real Supabase-backed project creation
 * so the three don't drift into three slightly different stage lists. */
export function defaultProjectStages(): ProjectStage[] {
  return [
    { id: "upload", label: PROJECT_STAGE_LABELS.upload, status: "active" },
    { id: "analyze", label: PROJECT_STAGE_LABELS.analyze, status: "pending" },
    { id: "validate", label: PROJECT_STAGE_LABELS.validate, status: "pending" },
    { id: "electrical", label: PROJECT_STAGE_LABELS.electrical, status: "pending" },
    { id: "routing", label: PROJECT_STAGE_LABELS.routing, status: "pending" },
    { id: "export", label: PROJECT_STAGE_LABELS.export, status: "pending" },
  ];
}

export function emptyProjectKpis(): ProjectKpis {
  return { floors: 0, rooms: 0, devices: 0, cableLengthMeters: 0, circuits: 0 };
}
