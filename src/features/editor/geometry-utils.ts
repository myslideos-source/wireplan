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

/** Unit vector perpendicular to a wall — used to probe which side (room)
 * a wall-mounted device faces, independent of exactly where on the wall's
 * thickness the placing click landed. */
export function wallNormal(wall: Wall): Point {
  const length = Math.hypot(wall.end.x - wall.start.x, wall.end.y - wall.start.y);
  if (length === 0) return { x: 0, y: 0 };
  const ux = (wall.end.x - wall.start.x) / length;
  const uy = (wall.end.y - wall.start.y) / length;
  return { x: -uy, y: ux };
}

export function boundingBoxOfPoints(points: Point[], paddingMm = 900) {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs) - paddingMm;
  const maxX = Math.max(...xs) + paddingMm;
  const minY = Math.min(...ys) - paddingMm;
  const maxY = Math.max(...ys) + paddingMm;
  return { minX, maxX, minY, maxY, width: maxX - minX, height: maxY - minY };
}

export function wallsBoundingBox(walls: Wall[], paddingMm = 900) {
  return boundingBoxOfPoints(
    walls.flatMap((wall) => [wall.start, wall.end]),
    paddingMm,
  );
}

export function polygonCentroid(polygon: Point[]): Point {
  const sum = polygon.reduce(
    (acc, point) => ({ x: acc.x + point.x, y: acc.y + point.y }),
    { x: 0, y: 0 },
  );
  return { x: sum.x / polygon.length, y: sum.y / polygon.length };
}

const EPS = 1; // 1mm tolerance for float comparisons on split/merge geometry

function rectBoundsOf(polygon: Point[]) {
  const xs = polygon.map((p) => p.x);
  const ys = polygon.map((p) => p.y);
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
  };
}

/**
 * Room split/merge below only support axis-aligned rectangles — true for
 * every room in the current mock geometry, but not a general polygon
 * operation. A non-rectangular room is left alone rather than silently
 * producing a wrong shape.
 */
export function isAxisAlignedRectangle(polygon: Point[]): boolean {
  if (polygon.length !== 4) return false;
  const { minX, maxX, minY, maxY } = rectBoundsOf(polygon);
  const corners = [
    { x: minX, y: minY },
    { x: maxX, y: minY },
    { x: maxX, y: maxY },
    { x: minX, y: maxY },
  ];
  const matched = new Set<number>();
  for (const point of polygon) {
    const idx = corners.findIndex(
      (c) => Math.abs(c.x - point.x) < EPS && Math.abs(c.y - point.y) < EPS,
    );
    if (idx === -1) return false;
    matched.add(idx);
  }
  return matched.size === 4;
}

export type SplitDirection = "vertical" | "horizontal";

/**
 * Splits a rectangular room polygon into two, plus the new dividing wall
 * between them. `ratio` (0–1) is where the divider falls along the split
 * axis. `vertical` = a vertical divider (left/right rooms); `horizontal` =
 * a horizontal divider (top/bottom rooms).
 */
export function splitRectangle(
  polygon: Point[],
  direction: SplitDirection,
  ratio: number,
) {
  const { minX, maxX, minY, maxY } = rectBoundsOf(polygon);
  const clampedRatio = Math.min(0.9, Math.max(0.1, ratio));

  if (direction === "vertical") {
    const splitX = minX + (maxX - minX) * clampedRatio;
    return {
      polyA: [
        { x: minX, y: minY },
        { x: splitX, y: minY },
        { x: splitX, y: maxY },
        { x: minX, y: maxY },
      ],
      polyB: [
        { x: splitX, y: minY },
        { x: maxX, y: minY },
        { x: maxX, y: maxY },
        { x: splitX, y: maxY },
      ],
      wall: { start: { x: splitX, y: minY }, end: { x: splitX, y: maxY } },
    };
  }

  const splitY = minY + (maxY - minY) * clampedRatio;
  return {
    polyA: [
      { x: minX, y: minY },
      { x: maxX, y: minY },
      { x: maxX, y: splitY },
      { x: minX, y: splitY },
    ],
    polyB: [
      { x: minX, y: splitY },
      { x: maxX, y: splitY },
      { x: maxX, y: maxY },
      { x: minX, y: maxY },
    ],
    wall: { start: { x: minX, y: splitY }, end: { x: maxX, y: splitY } },
  };
}

/**
 * Merges two rectangular rooms into one — only when they share a full
 * common edge with no gap or overlap (a clean side-by-side or
 * stacked layout). Returns null when that isn't the case, rather than
 * guessing at a shape.
 */
export function tryMergeAdjacentRects(
  polyA: Point[],
  polyB: Point[],
): { polygon: Point[]; sharedEdge: { start: Point; end: Point } } | null {
  if (!isAxisAlignedRectangle(polyA) || !isAxisAlignedRectangle(polyB)) {
    return null;
  }
  const a = rectBoundsOf(polyA);
  const b = rectBoundsOf(polyB);

  const sameHeight = Math.abs(a.minY - b.minY) < EPS && Math.abs(a.maxY - b.maxY) < EPS;
  if (sameHeight && Math.abs(a.maxX - b.minX) < EPS) {
    return {
      polygon: [
        { x: a.minX, y: a.minY }, { x: b.maxX, y: a.minY },
        { x: b.maxX, y: a.maxY }, { x: a.minX, y: a.maxY },
      ],
      sharedEdge: { start: { x: a.maxX, y: a.minY }, end: { x: a.maxX, y: a.maxY } },
    };
  }
  if (sameHeight && Math.abs(b.maxX - a.minX) < EPS) {
    return {
      polygon: [
        { x: b.minX, y: a.minY }, { x: a.maxX, y: a.minY },
        { x: a.maxX, y: a.maxY }, { x: b.minX, y: a.maxY },
      ],
      sharedEdge: { start: { x: a.minX, y: a.minY }, end: { x: a.minX, y: a.maxY } },
    };
  }

  const sameWidth = Math.abs(a.minX - b.minX) < EPS && Math.abs(a.maxX - b.maxX) < EPS;
  if (sameWidth && Math.abs(a.maxY - b.minY) < EPS) {
    return {
      polygon: [
        { x: a.minX, y: a.minY }, { x: a.maxX, y: a.minY },
        { x: a.maxX, y: b.maxY }, { x: a.minX, y: b.maxY },
      ],
      sharedEdge: { start: { x: a.minX, y: a.maxY }, end: { x: a.maxX, y: a.maxY } },
    };
  }
  if (sameWidth && Math.abs(b.maxY - a.minY) < EPS) {
    return {
      polygon: [
        { x: a.minX, y: b.minY }, { x: a.maxX, y: b.minY },
        { x: a.maxX, y: a.maxY }, { x: a.minX, y: a.maxY },
      ],
      sharedEdge: { start: { x: a.minX, y: a.minY }, end: { x: a.maxX, y: a.minY } },
    };
  }

  return null;
}

/** Whether a wall's segment lies along the given line (same coordinates,
 * either point order) within tolerance — used to find the wall a merge
 * should remove. */
export function wallMatchesSegment(
  wall: Pick<Wall, "start" | "end">,
  segment: { start: Point; end: Point },
): boolean {
  const close = (p: Point, q: Point) =>
    Math.abs(p.x - q.x) < EPS && Math.abs(p.y - q.y) < EPS;
  return (
    (close(wall.start, segment.start) && close(wall.end, segment.end)) ||
    (close(wall.start, segment.end) && close(wall.end, segment.start))
  );
}

/** Projects `point` onto the closest point of a wall's centerline,
 * returning the offset along the wall (for wall-mounted device
 * placement, §66) and the perpendicular distance. */
export function closestPointOnWall(wall: Wall, point: Point) {
  const dx = wall.end.x - wall.start.x;
  const dy = wall.end.y - wall.start.y;
  const lengthSq = dx * dx + dy * dy;
  const t =
    lengthSq === 0
      ? 0
      : Math.min(
          1,
          Math.max(0, ((point.x - wall.start.x) * dx + (point.y - wall.start.y) * dy) / lengthSq),
        );
  const length = Math.sqrt(lengthSq);
  const offset = t * length;
  const projected = { x: wall.start.x + dx * t, y: wall.start.y + dy * t };
  const distance = Math.hypot(point.x - projected.x, point.y - projected.y);
  return { offset, distance };
}

/** Finds the wall whose centerline is closest to `point` — used to snap a
 * newly placed wall-mounted device (outlet, switch, network) to a wall. */
export function findNearestWall(walls: Wall[], point: Point): Wall | null {
  let nearest: Wall | null = null;
  let nearestDistance = Infinity;
  for (const wall of walls) {
    const { distance } = closestPointOnWall(wall, point);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearest = wall;
    }
  }
  return nearest;
}

/** Standard ray-casting point-in-polygon test. */
export function isPointInPolygon(point: Point, polygon: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i];
    const b = polygon[j];
    const intersects =
      a.y > point.y !== b.y > point.y &&
      point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x;
    if (intersects) inside = !inside;
  }
  return inside;
}
