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

export type GeometryStatus =
  | "DRAFT"
  | "IN_REVIEW"
  | "VALIDATED"
  | "CONFIRMED"
  | "LOCKED";
