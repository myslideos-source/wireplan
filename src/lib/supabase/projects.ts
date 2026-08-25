import type { SupabaseClient } from "@supabase/supabase-js";
import type { Project } from "@/domain";
import { defaultProjectStages, emptyProjectKpis } from "@/domain";

interface ProjectRow {
  id: string;
  name: string;
  address: string | null;
  geometry_status: Project["geometryStatus"];
  updated_at: string;
}

/** DB rows never carry `stages`/`kpis` (§16 — kpis are always live-computed
 * from the actual floor data via `useLiveProjectKpis`, not a stored
 * snapshot; `stages` is a fixed client-side template today). Mapped in
 * here so both the server list/get and the client insert agree on shape. */
function mapProjectRow(row: ProjectRow): Project {
  return {
    id: row.id,
    name: row.name,
    address: row.address ?? "",
    geometryStatus: row.geometry_status,
    updatedAt: row.updated_at,
    stages: defaultProjectStages(),
    kpis: emptyProjectKpis(),
  };
}

export async function fetchProjects(
  supabase: SupabaseClient,
): Promise<Project[] | null> {
  const { data, error } = await supabase
    .from("projects")
    .select("id, name, address, geometry_status, updated_at")
    .order("updated_at", { ascending: false });
  if (error || !data) return null;
  return data.map(mapProjectRow);
}

export async function fetchProject(
  supabase: SupabaseClient,
  id: string,
): Promise<Project | null> {
  const { data, error } = await supabase
    .from("projects")
    .select("id, name, address, geometry_status, updated_at")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  return mapProjectRow(data);
}

export async function insertProject(
  supabase: SupabaseClient,
  input: { id: string; name: string; address: string },
): Promise<Project | null> {
  const { data, error } = await supabase
    .from("projects")
    .insert({ id: input.id, name: input.name, address: input.address || null })
    .select("id, name, address, geometry_status, updated_at")
    .single();
  if (error || !data) return null;
  return mapProjectRow(data);
}
