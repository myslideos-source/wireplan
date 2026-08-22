import type { Floor, Wall, Room, Opening } from "@/domain";
import { polygonAreaSqMeters } from "@/domain";

/**
 * Demo digital-twin geometry for the editor (Phase 3). Coordinates are in
 * millimeters (§63), never pixels. Room areas are computed from the
 * polygon via the shoelace formula, not hand-typed, so the Inspector shows
 * a genuinely derived number rather than a fabricated one.
 *
 * This stands in for a real uploaded/validated floor until the AI plan
 * analysis pipeline (Phase 2 backend) and geometry persistence exist.
 */
export interface FloorGeometry {
  floor: Floor;
  walls: Wall[];
  rooms: Room[];
  openings: Opening[];
}

const FLOOR: Floor = {
  id: "floor-eg",
  projectId: "proj-mustermann",
  name: "Erdgeschoss",
  level: 0,
};

const WALLS: Wall[] = [
  { id: "w1", floorId: FLOOR.id, start: { x: 0, y: 0 }, end: { x: 12400, y: 0 }, thickness: 200, height: 2700 },
  { id: "w2", floorId: FLOOR.id, start: { x: 12400, y: 0 }, end: { x: 12400, y: 8800 }, thickness: 200, height: 2700 },
  { id: "w3", floorId: FLOOR.id, start: { x: 12400, y: 8800 }, end: { x: 0, y: 8800 }, thickness: 200, height: 2700 },
  { id: "w4", floorId: FLOOR.id, start: { x: 0, y: 8800 }, end: { x: 0, y: 0 }, thickness: 200, height: 2700 },
  { id: "w5", floorId: FLOOR.id, start: { x: 6800, y: 0 }, end: { x: 6800, y: 4800 }, thickness: 120, height: 2700 },
  { id: "w6", floorId: FLOOR.id, start: { x: 0, y: 4800 }, end: { x: 12400, y: 4800 }, thickness: 120, height: 2700 },
  { id: "w7", floorId: FLOOR.id, start: { x: 0, y: 5600 }, end: { x: 12400, y: 5600 }, thickness: 120, height: 2700 },
  { id: "w8", floorId: FLOOR.id, start: { x: 4200, y: 5600 }, end: { x: 4200, y: 8800 }, thickness: 120, height: 2700 },
  { id: "w9", floorId: FLOOR.id, start: { x: 7200, y: 5600 }, end: { x: 7200, y: 8800 }, thickness: 120, height: 2700 },
];

function room(id: string, name: string, type: string, polygon: Room["polygon"]): Room {
  return {
    id,
    floorId: FLOOR.id,
    name,
    type,
    polygon,
    area: polygonAreaSqMeters(polygon),
    height: 2700,
  };
}

const ROOMS: Room[] = [
  room("room-wohnen", "Wohnen / Essen", "Wohnzimmer", [
    { x: 0, y: 0 }, { x: 6800, y: 0 }, { x: 6800, y: 4800 }, { x: 0, y: 4800 },
  ]),
  room("room-kueche", "Küche", "Küche", [
    { x: 6800, y: 0 }, { x: 12400, y: 0 }, { x: 12400, y: 4800 }, { x: 6800, y: 4800 },
  ]),
  room("room-flur", "Flur", "Flur", [
    { x: 0, y: 4800 }, { x: 12400, y: 4800 }, { x: 12400, y: 5600 }, { x: 0, y: 5600 },
  ]),
  room("room-zimmer1", "Zimmer 1", "Schlafzimmer", [
    { x: 0, y: 5600 }, { x: 4200, y: 5600 }, { x: 4200, y: 8800 }, { x: 0, y: 8800 },
  ]),
  room("room-bad", "Bad", "Bad", [
    { x: 4200, y: 5600 }, { x: 7200, y: 5600 }, { x: 7200, y: 8800 }, { x: 4200, y: 8800 },
  ]),
  room("room-zimmer2", "Zimmer 2", "Schlafzimmer", [
    { x: 7200, y: 5600 }, { x: 12400, y: 5600 }, { x: 12400, y: 8800 }, { x: 7200, y: 8800 },
  ]),
];

const OPENINGS: Opening[] = [
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

const MOCK_GEOMETRY: Record<string, FloorGeometry> = {
  "proj-mustermann": { floor: FLOOR, walls: WALLS, rooms: ROOMS, openings: OPENINGS },
};

export async function getGeometryForProject(
  projectId: string,
): Promise<FloorGeometry | undefined> {
  return MOCK_GEOMETRY[projectId];
}
