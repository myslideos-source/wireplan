import type { Floor, Wall, Room, Opening } from "@/domain";
import { polygonAreaSqMeters } from "@/domain";

/**
 * Demo digital-twin geometry for the editor (Phase 3). Coordinates are in
 * millimeters (§63), never pixels. Room areas are computed from the
 * polygon via the shoelace formula, not hand-typed, so the Inspector shows
 * a genuinely derived number rather than a fabricated number.
 *
 * This stands in for a real uploaded/validated floor until the AI plan
 * analysis pipeline (Phase 2 backend) and geometry persistence exist.
 *
 * A project has one FloorGeometry per level (EG, OG, ...) — the dashboard's
 * "Stockwerke" KPI has always claimed 2 for the demo project, so both
 * floors are modeled here, not just the ground floor.
 */
export interface FloorGeometry {
  floor: Floor;
  walls: Wall[];
  rooms: Room[];
  openings: Opening[];
}

const EG_FLOOR: Floor = {
  id: "floor-eg",
  projectId: "proj-mustermann",
  name: "Erdgeschoss",
  level: 0,
};

const EG_WALLS: Wall[] = [
  { id: "w1", floorId: EG_FLOOR.id, start: { x: 0, y: 0 }, end: { x: 12400, y: 0 }, thickness: 200, height: 2700 },
  { id: "w2", floorId: EG_FLOOR.id, start: { x: 12400, y: 0 }, end: { x: 12400, y: 8800 }, thickness: 200, height: 2700 },
  { id: "w3", floorId: EG_FLOOR.id, start: { x: 12400, y: 8800 }, end: { x: 0, y: 8800 }, thickness: 200, height: 2700 },
  { id: "w4", floorId: EG_FLOOR.id, start: { x: 0, y: 8800 }, end: { x: 0, y: 0 }, thickness: 200, height: 2700 },
  { id: "w5", floorId: EG_FLOOR.id, start: { x: 6800, y: 0 }, end: { x: 6800, y: 4800 }, thickness: 120, height: 2700 },
  { id: "w6", floorId: EG_FLOOR.id, start: { x: 0, y: 4800 }, end: { x: 12400, y: 4800 }, thickness: 120, height: 2700 },
  { id: "w7", floorId: EG_FLOOR.id, start: { x: 0, y: 5600 }, end: { x: 12400, y: 5600 }, thickness: 120, height: 2700 },
  { id: "w8", floorId: EG_FLOOR.id, start: { x: 4200, y: 5600 }, end: { x: 4200, y: 8800 }, thickness: 120, height: 2700 },
  { id: "w9", floorId: EG_FLOOR.id, start: { x: 7200, y: 5600 }, end: { x: 7200, y: 8800 }, thickness: 120, height: 2700 },
];

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

const EG_OPENINGS: Opening[] = [
  { id: "d1", wallId: "w6", type: "door", offset: 2400, width: 900 },
  { id: "d2", wallId: "w6", type: "door", offset: 8200, width: 900 },
  { id: "d3", wallId: "w7", type: "door", offset: 1600, width: 900 },
  { id: "d4", wallId: "w7", type: "door", offset: 5600, width: 900 },
  { id: "d5", wallId: "w7", type: "door", offset: 9400, width: 900 },
  { id: "wi1", wallId: "w1", type: "window", offset: 2000, width: 1600 },
  { id: "wi2", wallId: "w1", type: "window", offset: 8800, width: 1600 },
  { id: "wi3", wallId: "w4", type: "window", offset: 1600, width: 1400 },
  { id: "wi4", wallId: "w2", type: "window", offset: 1600, width: 1400 },
  { id: "wi5", wallId: "w2", type: "window", offset: 6400, width: 1400 },
  { id: "wi6", wallId: "w3", type: "window", offset: 1400, width: 1600 },
  { id: "wi7", wallId: "w3", type: "window", offset: 8600, width: 1600 },
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
const OG_WALLS: Wall[] = [
  { id: "og-w1", floorId: OG_FLOOR.id, start: { x: 0, y: 0 }, end: { x: 12400, y: 0 }, thickness: 200, height: 2600 },
  { id: "og-w2", floorId: OG_FLOOR.id, start: { x: 12400, y: 0 }, end: { x: 12400, y: 8800 }, thickness: 200, height: 2600 },
  { id: "og-w3", floorId: OG_FLOOR.id, start: { x: 12400, y: 8800 }, end: { x: 0, y: 8800 }, thickness: 200, height: 2600 },
  { id: "og-w4", floorId: OG_FLOOR.id, start: { x: 0, y: 8800 }, end: { x: 0, y: 0 }, thickness: 200, height: 2600 },
  { id: "og-w5", floorId: OG_FLOOR.id, start: { x: 3100, y: 0 }, end: { x: 3100, y: 4200 }, thickness: 120, height: 2600 },
  { id: "og-w6", floorId: OG_FLOOR.id, start: { x: 6200, y: 0 }, end: { x: 6200, y: 4200 }, thickness: 120, height: 2600 },
  { id: "og-w7", floorId: OG_FLOOR.id, start: { x: 9300, y: 0 }, end: { x: 9300, y: 4200 }, thickness: 120, height: 2600 },
  { id: "og-w8", floorId: OG_FLOOR.id, start: { x: 0, y: 4200 }, end: { x: 12400, y: 4200 }, thickness: 120, height: 2600 },
  { id: "og-w9", floorId: OG_FLOOR.id, start: { x: 0, y: 5000 }, end: { x: 12400, y: 5000 }, thickness: 120, height: 2600 },
  { id: "og-w10", floorId: OG_FLOOR.id, start: { x: 4200, y: 5000 }, end: { x: 4200, y: 8800 }, thickness: 120, height: 2600 },
  { id: "og-w11", floorId: OG_FLOOR.id, start: { x: 8200, y: 5000 }, end: { x: 8200, y: 8800 }, thickness: 120, height: 2600 },
];

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

const OG_OPENINGS: Opening[] = [
  { id: "d-og-1", wallId: "og-w8", type: "door", offset: 1550, width: 900 },
  { id: "d-og-2", wallId: "og-w8", type: "door", offset: 4650, width: 900 },
  { id: "d-og-3", wallId: "og-w8", type: "door", offset: 7750, width: 900 },
  { id: "d-og-4", wallId: "og-w8", type: "door", offset: 10850, width: 900 },
  { id: "d-og-5", wallId: "og-w9", type: "door", offset: 2100, width: 900 },
  { id: "d-og-6", wallId: "og-w9", type: "door", offset: 6200, width: 900 },
  { id: "d-og-7", wallId: "og-w9", type: "door", offset: 10300, width: 900 },
  { id: "wi-og-1", wallId: "og-w1", type: "window", offset: 1550, width: 1400 },
  { id: "wi-og-2", wallId: "og-w1", type: "window", offset: 4650, width: 1400 },
  { id: "wi-og-3", wallId: "og-w1", type: "window", offset: 7750, width: 1400 },
  { id: "wi-og-4", wallId: "og-w1", type: "window", offset: 10850, width: 1200 },
  { id: "wi-og-5", wallId: "og-w3", type: "window", offset: 10300, width: 1400 },
  { id: "wi-og-6", wallId: "og-w3", type: "window", offset: 6200, width: 1200 },
  { id: "wi-og-7", wallId: "og-w3", type: "window", offset: 2100, width: 1400 },
];

const MOCK_GEOMETRY: Record<string, FloorGeometry[]> = {
  "proj-mustermann": [
    { floor: EG_FLOOR, walls: EG_WALLS, rooms: EG_ROOMS, openings: EG_OPENINGS },
    { floor: OG_FLOOR, walls: OG_WALLS, rooms: OG_ROOMS, openings: OG_OPENINGS },
  ],
};

/** All floors for a project, ordered by level. */
export async function getGeometriesForProject(
  projectId: string,
): Promise<FloorGeometry[] | undefined> {
  return MOCK_GEOMETRY[projectId];
}
