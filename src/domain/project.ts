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
