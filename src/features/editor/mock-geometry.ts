import type { Floor, Room } from "@/domain";

/**
 * A project's floor geometry (Phase 3, migrated to the locked-raster
 * model in Phase 11). Coordinates are in millimeters (§63), never pixels.
 *
 * There is no seeded demo geometry here (removed — it was showing as a
 * confusing fixed set of rooms instead of whatever plan a user actually
 * uploaded). A project genuinely has no floors until its owner uploads a
 * plan or manually creates one, which is exactly what `getGeometriesForProject`
 * below reflects: every project starts with none, same honesty rule as
 * everywhere else (§85) — this stands in for real geometry persistence,
 * which doesn't exist yet.
 */
export interface FloorGeometry {
  floor: Floor;
  rooms: Room[];
}

const MOCK_GEOMETRY: Record<string, FloorGeometry[]> = {};

/** All floors for a project, ordered by level — always empty until a real
 * floor is created (upload or "Etage anlegen"); those live only in the
 * client-side editor store (see store.ts), not here. */
export async function getGeometriesForProject(
  projectId: string,
): Promise<FloorGeometry[] | undefined> {
  return MOCK_GEOMETRY[projectId];
}
