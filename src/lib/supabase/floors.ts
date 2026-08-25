import type { SupabaseClient } from "@supabase/supabase-js";
import type { Floor } from "@/domain";
import type { FloorMutableSlice } from "@/features/editor/store";

interface FloorRow {
  id: string;
  project_id: string;
  name: string;
  level: number;
  state: Partial<FloorMutableSlice>;
}

export interface LoadedFloor {
  floor: Floor;
  state: FloorMutableSlice;
}

/** A floor's `state` jsonb only ever holds what was actually saved —
 * older/partial rows (or a floor saved before a new slice key existed)
 * fall back per-key to an empty default rather than crashing on a
 * missing field. */
function withDefaults(state: Partial<FloorMutableSlice>): FloorMutableSlice {
  return {
    rooms: state.rooms ?? [],
    devices: state.devices ?? [],
    roomCircuits: state.roomCircuits ?? {},
    technikraumRoomId: state.technikraumRoomId ?? null,
    distributionBoard: state.distributionBoard ?? null,
    cables: state.cables ?? [],
    smartHomeDevices: state.smartHomeDevices ?? [],
    backgroundImage: state.backgroundImage ?? null,
    treeBranches: state.treeBranches ?? [],
    audioZones: state.audioZones ?? [],
    fixedConsumers: state.fixedConsumers ?? [],
    treeJunctions: state.treeJunctions ?? [],
    treeEdges: state.treeEdges ?? [],
  };
}

export async function fetchFloorsForProject(
  supabase: SupabaseClient,
  projectId: string,
): Promise<LoadedFloor[] | null> {
  const { data, error } = await supabase
    .from("floors")
    .select("id, project_id, name, level, state")
    .eq("project_id", projectId)
    .order("level", { ascending: true });
  if (error || !data) return null;
  return (data as FloorRow[]).map((row) => ({
    floor: { id: row.id, projectId: row.project_id, name: row.name, level: row.level },
    state: withDefaults(row.state ?? {}),
  }));
}

export async function insertFloor(
  supabase: SupabaseClient,
  floor: Floor,
  state: FloorMutableSlice,
): Promise<void> {
  await supabase.from("floors").insert({
    id: floor.id,
    project_id: floor.projectId,
    name: floor.name,
    level: floor.level,
    state,
  });
}

export async function saveFloorState(
  supabase: SupabaseClient,
  floorId: string,
  state: FloorMutableSlice,
): Promise<void> {
  await supabase
    .from("floors")
    .update({ state, updated_at: new Date().toISOString() })
    .eq("id", floorId);
}
