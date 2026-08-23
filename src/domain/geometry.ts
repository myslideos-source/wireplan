/**
 * Internal coordinate system truth is millimeters, never pixels (§63).
 */
export interface Point {
  x: number;
  y: number;
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
