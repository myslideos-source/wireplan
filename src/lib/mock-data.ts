import type { Project } from "@/domain";

/**
 * Local seed data so the app has at least one project to open before a
 * live Supabase project is wired up (no credentials exist in this
 * environment yet). Swapping this for a real data source is a config
 * change: every page reads projects through `getProjects` / `getProject`
 * below.
 *
 * These start as honestly empty project shells — no fabricated floors,
 * rooms, devices, or cable lengths, and no stage marked "done"/"active"
 * for work that never actually happened. Everything here becomes real
 * only once a plan is actually uploaded (§85 honesty rule).
 */
const MOCK_PROJECTS: Project[] = [
  {
    id: "proj-mustermann",
    name: "Neubau Familie Mustermann",
    address: "Ahornweg 12, 82031 Grünwald",
    geometryStatus: "DRAFT",
    updatedAt: "2026-08-20T09:15:00.000Z",
    stages: [
      { id: "upload", label: "Grundriss hochladen", status: "active" },
      { id: "analyze", label: "Analysieren", status: "pending" },
      { id: "validate", label: "Validieren", status: "pending" },
      { id: "electrical", label: "Elektroplanung", status: "pending" },
      { id: "routing", label: "Routing", status: "pending" },
      { id: "export", label: "Export", status: "pending" },
    ],
    kpis: {
      floors: 0,
      rooms: 0,
      devices: 0,
      cableLengthMeters: 0,
      circuits: 0,
    },
  },
  {
    id: "proj-seehaus",
    name: "Seehaus Weber",
    address: "Uferstraße 4, 83700 Rottach-Egern",
    geometryStatus: "DRAFT",
    updatedAt: "2026-08-12T14:40:00.000Z",
    stages: [
      { id: "upload", label: "Grundriss hochladen", status: "active" },
      { id: "analyze", label: "Analysieren", status: "pending" },
      { id: "validate", label: "Validieren", status: "pending" },
      { id: "electrical", label: "Elektroplanung", status: "pending" },
      { id: "routing", label: "Routing", status: "pending" },
      { id: "export", label: "Export", status: "pending" },
    ],
    kpis: {
      floors: 0,
      rooms: 0,
      devices: 0,
      cableLengthMeters: 0,
      circuits: 0,
    },
  },
];

export async function getProjects(): Promise<Project[]> {
  return MOCK_PROJECTS;
}

export async function getProject(id: string): Promise<Project | undefined> {
  return MOCK_PROJECTS.find((project) => project.id === id);
}

export async function getPrimaryProject(): Promise<Project> {
  return MOCK_PROJECTS[0];
}
