import type { Project } from "@/domain";
import { defaultProjectStages, emptyProjectKpis } from "@/domain";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { fetchProjects, fetchProject } from "@/lib/supabase/projects";

/**
 * Local seed data — the fallback used only when no Supabase project is
 * configured (`NEXT_PUBLIC_SUPABASE_URL`/`_ANON_KEY` unset) or a request
 * to it fails. Every page reads projects through `getProjects` /
 * `getProject` below, which try Supabase first and fall back to this.
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
    stages: defaultProjectStages(),
    kpis: emptyProjectKpis(),
  },
  {
    id: "proj-seehaus",
    name: "Seehaus Weber",
    address: "Uferstraße 4, 83700 Rottach-Egern",
    geometryStatus: "DRAFT",
    updatedAt: "2026-08-12T14:40:00.000Z",
    stages: defaultProjectStages(),
    kpis: emptyProjectKpis(),
  },
];

export async function getProjects(): Promise<Project[]> {
  const supabase = await createSupabaseServerClient();
  if (supabase) {
    const projects = await fetchProjects(supabase);
    if (projects) return projects;
  }
  return MOCK_PROJECTS;
}

export async function getProject(id: string): Promise<Project | undefined> {
  const supabase = await createSupabaseServerClient();
  if (supabase) {
    const project = await fetchProject(supabase, id);
    if (project) return project;
  }
  return MOCK_PROJECTS.find((project) => project.id === id);
}

export async function getPrimaryProject(): Promise<Project> {
  const projects = await getProjects();
  return projects[0];
}
