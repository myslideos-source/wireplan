/**
 * Internal coordinate system truth is millimeters, never pixels (§63).
 */
export interface Point {
  x: number;
  y: number;
}

export interface Wall {
  id: string;
  floorId: string;
  start: Point;
  end: Point;
  thickness: number;
  height: number;
}

export interface Room {
  id: string;
  floorId: string;
  name: string;
  type: string;
  polygon: Point[];
  area: number;
  height: number;
  /** Freitext für Planungshinweise (§99) — nie automatisch befüllt. */
  notes?: string;
}

export interface Floor {
  id: string;
  projectId: string;
  name: string;
  level: number;
}

/** Electrical/smart-home devices mount to a wall offset, not raw x/y (§66) so
 * they follow the wall when it moves. */
export interface WallMountedDevice {
  id: string;
  wallId: string;
  offset: number;
  height: number;
}

/**
 * Doors and windows are openings along a wall, positioned by offset (not
 * x/y) so they stay attached when the wall is edited — same reasoning as
 * WallMountedDevice above.
 */
export interface Opening {
  id: string;
  wallId: string;
  type: "door" | "window";
  offset: number;
  width: number;
}

export type GeometryStatus =
  | "DRAFT"
  | "IN_REVIEW"
  | "VALIDATED"
  | "CONFIRMED"
  | "LOCKED";

/** Shoelace formula. `polygon` is in millimeters; returns square meters. */
export function polygonAreaSqMeters(polygon: Point[]): number {
  let sumMm2 = 0;
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i];
    const b = polygon[(i + 1) % polygon.length];
    sumMm2 += a.x * b.y - b.x * a.y;
  }
  return Math.abs(sumMm2) / 2 / 1_000_000;
}

/** Euclidean wall length in meters from its mm start/end points. */
export function wallLengthMeters(wall: Pick<Wall, "start" | "end">): number {
  const dx = wall.end.x - wall.start.x;
  const dy = wall.end.y - wall.start.y;
  return Math.sqrt(dx * dx + dy * dy) / 1000;
}
