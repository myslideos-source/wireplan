import type { Point, Wall } from "@/domain";

/** All current mock walls are axis-aligned; these helpers assume that. */
export function wallOrientation(wall: Wall): "h" | "v" {
  const dx = Math.abs(wall.end.x - wall.start.x);
  const dy = Math.abs(wall.end.y - wall.start.y);
  return dx >= dy ? "h" : "v";
}

export function pointAtOffset(wall: Wall, offset: number): Point {
  const length = Math.hypot(wall.end.x - wall.start.x, wall.end.y - wall.start.y);
  if (length === 0) return wall.start;
  const ux = (wall.end.x - wall.start.x) / length;
  const uy = (wall.end.y - wall.start.y) / length;
  return { x: wall.start.x + ux * offset, y: wall.start.y + uy * offset };
}

export function wallsBoundingBox(walls: Wall[], paddingMm = 900) {
  const xs = walls.flatMap((wall) => [wall.start.x, wall.end.x]);
  const ys = walls.flatMap((wall) => [wall.start.y, wall.end.y]);
  const minX = Math.min(...xs) - paddingMm;
  const maxX = Math.max(...xs) + paddingMm;
  const minY = Math.min(...ys) - paddingMm;
  const maxY = Math.max(...ys) + paddingMm;
  return { minX, maxX, minY, maxY, width: maxX - minX, height: maxY - minY };
}

export function polygonCentroid(polygon: Point[]): Point {
  const sum = polygon.reduce(
    (acc, point) => ({ x: acc.x + point.x, y: acc.y + point.y }),
    { x: 0, y: 0 },
  );
  return { x: sum.x / polygon.length, y: sum.y / polygon.length };
}
