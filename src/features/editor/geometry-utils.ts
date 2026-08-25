import type { Point, Room, ElectricalDevice } from "@/domain";

export function devicePosition(device: ElectricalDevice): Point {
  return device.mount.position;
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

/**
 * The canvas/export viewport extent (Phase 11 — there's no wall geometry
 * left to bound against). Falls back through what's actually available:
 * drawn room zones first, then the locked background image's own extent,
 * then a fixed default box for a brand-new, still-empty floor.
 */
export function floorExtentBox(
  rooms: Room[],
  background: { x: number; y: number; width: number; height: number } | null,
  paddingMm = 900,
) {
  if (rooms.length > 0) {
    return boundingBoxOfPoints(rooms.flatMap((r) => r.polygon), paddingMm);
  }
  if (background) {
    return boundingBoxOfPoints(
      [
        { x: background.x, y: background.y },
        { x: background.x + background.width, y: background.y + background.height },
      ],
      paddingMm,
    );
  }
  return { minX: 0, minY: 0, maxX: 10000, maxY: 10000, width: 10000, height: 10000 };
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
 * Splits a rectangular room polygon into two. `ratio` (0–1) is where the
 * divider falls along the split axis. `vertical` = a vertical divider
 * (left/right rooms); `horizontal` = a horizontal divider (top/bottom
 * rooms). There's no wall to insert alongside the split (Phase 11) — only
 * the two new room polygons are produced.
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
): { polygon: Point[] } | null {
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
    };
  }
  if (sameHeight && Math.abs(b.maxX - a.minX) < EPS) {
    return {
      polygon: [
        { x: b.minX, y: a.minY }, { x: a.maxX, y: a.minY },
        { x: a.maxX, y: a.maxY }, { x: b.minX, y: a.maxY },
      ],
    };
  }

  const sameWidth = Math.abs(a.minX - b.minX) < EPS && Math.abs(a.maxX - b.maxX) < EPS;
  if (sameWidth && Math.abs(a.maxY - b.minY) < EPS) {
    return {
      polygon: [
        { x: a.minX, y: a.minY }, { x: a.maxX, y: a.minY },
        { x: a.maxX, y: b.maxY }, { x: a.minX, y: b.maxY },
      ],
    };
  }
  if (sameWidth && Math.abs(b.maxY - a.minY) < EPS) {
    return {
      polygon: [
        { x: a.minX, y: b.minY }, { x: a.maxX, y: b.minY },
        { x: a.maxX, y: a.maxY }, { x: a.minX, y: a.maxY },
      ],
    };
  }

  return null;
}

/** Standard ray-casting point-in-polygon test. */
export type SpotArrangement = "line" | "grid" | "rectangle" | "circle" | "manual";

function pointOnRectanglePerimeter(
  box: { minX: number; minY: number; width: number; height: number },
  distance: number,
): Point {
  const { minX, minY, width, height } = box;
  let d = distance;
  if (d <= width) return { x: minX + d, y: minY };
  d -= width;
  if (d <= height) return { x: minX + width, y: minY + d };
  d -= height;
  if (d <= width) return { x: minX + width - d, y: minY + height };
  d -= width;
  return { x: minX, y: minY + height - d };
}

/**
 * Auto-distributes `count` points inside a room for the multi-spot
 * placement tool (§8). Points are a starting layout, not a final one —
 * every spot stays individually selectable and movable afterward, same
 * as any other point-mounted device.
 */
export function computeSpotArrayPositions(
  room: Room,
  count: number,
  arrangement: SpotArrangement,
): Point[] {
  const box = boundingBoxOfPoints(room.polygon, -600);
  const cx = box.minX + box.width / 2;
  const cy = box.minY + box.height / 2;
  if (count <= 1) return [{ x: cx, y: cy }];

  if (arrangement === "line") {
    const usableWidth = box.width * 0.8;
    return Array.from({ length: count }, (_, i) => ({
      x: box.minX + box.width * 0.1 + (usableWidth * i) / (count - 1),
      y: cy,
    }));
  }

  if (arrangement === "grid") {
    const cols = Math.ceil(Math.sqrt(count));
    const rows = Math.ceil(count / cols);
    return Array.from({ length: count }, (_, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      return {
        x: cols === 1 ? cx : box.minX + (box.width * (col + 0.5)) / cols,
        y: rows === 1 ? cy : box.minY + (box.height * (row + 0.5)) / rows,
      };
    });
  }

  if (arrangement === "rectangle") {
    const perimeter = 2 * (box.width + box.height);
    return Array.from({ length: count }, (_, i) =>
      pointOnRectanglePerimeter(box, (perimeter * i) / count),
    );
  }

  if (arrangement === "circle") {
    const radius = Math.min(box.width, box.height) / 2;
    return Array.from({ length: count }, (_, i) => {
      const angle = (2 * Math.PI * i) / count - Math.PI / 2;
      return { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) };
    });
  }

  // "manual" — a modest diagonal stagger near the room center rather than
  // a real one-by-one placement flow (that would need N separate clicks);
  // every spot is immediately draggable to its real position from here.
  return Array.from({ length: count }, (_, i) => ({
    x: cx + i * 220 - ((count - 1) * 220) / 2,
    y: cy + i * 60 - ((count - 1) * 60) / 2,
  }));
}

/** Assigned by room order (§97) — a stable, purely cosmetic color per
 * room used both for the Räume-tab list swatches and the canvas's
 * room-editing overlay. Not persisted on the room itself: recomputed
 * from position in the current `rooms` array so it stays stable as long
 * as rooms aren't reordered, without needing a stored color field. */
export const ROOM_ZONE_COLORS = [
  "#1B7A4A", // Loxone green
  "#2F6FD6", // blue
  "#D97A06", // amber
  "#7C3AED", // violet
  "#0D9488", // teal
  "#DB2777", // berry
];

export function roomZoneColor(index: number): string {
  return ROOM_ZONE_COLORS[index % ROOM_ZONE_COLORS.length];
}

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
