import type { Floor, Room } from "@/domain";
import { polygonAreaSqMeters } from "@/domain";

/**
 * Demo digital-twin geometry for the editor (Phase 3, migrated to the
 * locked-raster model in Phase 11). Coordinates are in millimeters (§63),
 * never pixels. Room areas are computed from the polygon via the shoelace
 * formula, not hand-typed, so the Inspector shows a genuinely derived
 * number rather than a fabricated number.
 *
 * This stands in for a real uploaded/validated floor until geometry
 * persistence exists.
 *
 * A project has one FloorGeometry per level (EG, OG, ...) — the dashboard's
 * "Stockwerke" KPI has always claimed 2 for the demo project, so both
 * floors are modeled here, not just the ground floor.
 */
export interface FloorGeometry {
  floor: Floor;
  rooms: Room[];
}

const EG_FLOOR: Floor = {
  id: "floor-eg",
  projectId: "proj-mustermann",
  name: "Erdgeschoss",
  level: 0,
};

function makeRoom(
  id: string,
  floorId: string,
  name: string,
  type: string,
  polygon: Room["polygon"],
): Room {
  return {
    id,
    floorId,
    name,
    type,
    polygon,
    area: polygonAreaSqMeters(polygon),
    height: 2700,
  };
}

const EG_ROOMS: Room[] = [
  makeRoom("room-wohnen", EG_FLOOR.id, "Wohnen / Essen", "Wohnzimmer", [
    { x: 0, y: 0 }, { x: 6800, y: 0 }, { x: 6800, y: 4800 }, { x: 0, y: 4800 },
  ]),
  makeRoom("room-kueche", EG_FLOOR.id, "Küche", "Küche", [
    { x: 6800, y: 0 }, { x: 12400, y: 0 }, { x: 12400, y: 4800 }, { x: 6800, y: 4800 },
  ]),
  makeRoom("room-flur", EG_FLOOR.id, "Flur", "Flur", [
    { x: 0, y: 4800 }, { x: 12400, y: 4800 }, { x: 12400, y: 5600 }, { x: 0, y: 5600 },
  ]),
  makeRoom("room-zimmer1", EG_FLOOR.id, "Zimmer 1", "Schlafzimmer", [
    { x: 0, y: 5600 }, { x: 4200, y: 5600 }, { x: 4200, y: 8800 }, { x: 0, y: 8800 },
  ]),
  makeRoom("room-bad", EG_FLOOR.id, "Bad", "Bad", [
    { x: 4200, y: 5600 }, { x: 7200, y: 5600 }, { x: 7200, y: 8800 }, { x: 4200, y: 8800 },
  ]),
  makeRoom("room-zimmer2", EG_FLOOR.id, "Zimmer 2", "Schlafzimmer", [
    { x: 7200, y: 5600 }, { x: 12400, y: 5600 }, { x: 12400, y: 8800 }, { x: 7200, y: 8800 },
  ]),
];

const OG_FLOOR: Floor = {
  id: "floor-og",
  projectId: "proj-mustermann",
  name: "Obergeschoss",
  level: 1,
};

// Same footprint as the EG (upper floors stack on the floor below), divided
// into a top row of four rooms, a central corridor, and a bottom row of
// three rooms — eight rooms total, matching the dashboard's long-standing
// "14 Räume" KPI (6 EG + 8 OG) that had nothing behind it until now.
const OG_ROOMS: Room[] = [
  makeRoom("room-og-zimmer3", OG_FLOOR.id, "Zimmer 3", "Schlafzimmer", [
    { x: 0, y: 0 }, { x: 3100, y: 0 }, { x: 3100, y: 4200 }, { x: 0, y: 4200 },
  ]),
  makeRoom("room-og-zimmer4", OG_FLOOR.id, "Zimmer 4", "Schlafzimmer", [
    { x: 3100, y: 0 }, { x: 6200, y: 0 }, { x: 6200, y: 4200 }, { x: 3100, y: 4200 },
  ]),
  makeRoom("room-og-zimmer5", OG_FLOOR.id, "Zimmer 5", "Schlafzimmer", [
    { x: 6200, y: 0 }, { x: 9300, y: 0 }, { x: 9300, y: 4200 }, { x: 6200, y: 4200 },
  ]),
  makeRoom("room-og-bad", OG_FLOOR.id, "Bad OG", "Bad", [
    { x: 9300, y: 0 }, { x: 12400, y: 0 }, { x: 12400, y: 4200 }, { x: 9300, y: 4200 },
  ]),
  makeRoom("room-og-flur", OG_FLOOR.id, "Flur OG", "Flur", [
    { x: 0, y: 4200 }, { x: 12400, y: 4200 }, { x: 12400, y: 5000 }, { x: 0, y: 5000 },
  ]),
  makeRoom("room-og-zimmer6", OG_FLOOR.id, "Zimmer 6", "Schlafzimmer", [
    { x: 0, y: 5000 }, { x: 4200, y: 5000 }, { x: 4200, y: 8800 }, { x: 0, y: 8800 },
  ]),
  makeRoom("room-og-abstell", OG_FLOOR.id, "Abstellraum", "Abstellraum", [
    { x: 4200, y: 5000 }, { x: 8200, y: 5000 }, { x: 8200, y: 8800 }, { x: 4200, y: 8800 },
  ]),
  makeRoom("room-og-arbeit", OG_FLOOR.id, "Arbeitszimmer", "Arbeitszimmer", [
    { x: 8200, y: 5000 }, { x: 12400, y: 5000 }, { x: 12400, y: 8800 }, { x: 8200, y: 8800 },
  ]),
];

const MOCK_GEOMETRY: Record<string, FloorGeometry[]> = {
  "proj-mustermann": [
    { floor: EG_FLOOR, rooms: EG_ROOMS },
    { floor: OG_FLOOR, rooms: OG_ROOMS },
  ],
};

/** All floors for a project, ordered by level. */
export async function getGeometriesForProject(
  projectId: string,
): Promise<FloorGeometry[] | undefined> {
  return MOCK_GEOMETRY[projectId];
}
