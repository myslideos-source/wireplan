import type { Opening, Point, Wall } from "@/domain";
import { wallsBoundingBox } from "@/features/editor/geometry-utils";

const CELL_SIZE_MM = 150;
/** Half the wall thickness plus a small margin, so a routed cable can't
 * hug the wall surface exactly — a bit of clearance is realistic. */
const WALL_MARGIN_MM = 60;
/** Cells to search outward when a start/end point lands inside a blocked
 * cell (e.g. a wall-mounted device sits on the wall centerline itself). */
const MAX_NUDGE_RADIUS = 20;

interface Grid {
  minX: number;
  minY: number;
  cols: number;
  rows: number;
  blocked: Uint8Array;
}

interface Cell {
  cx: number;
  cy: number;
}

function inBounds(grid: Grid, cx: number, cy: number): boolean {
  return cx >= 0 && cy >= 0 && cx < grid.cols && cy < grid.rows;
}

function isBlocked(grid: Grid, cx: number, cy: number): boolean {
  return !inBounds(grid, cx, cy) || grid.blocked[cy * grid.cols + cx] === 1;
}

function cellOf(grid: Grid, point: Point): Cell {
  return {
    cx: Math.floor((point.x - grid.minX) / CELL_SIZE_MM),
    cy: Math.floor((point.y - grid.minY) / CELL_SIZE_MM),
  };
}

function worldOf(grid: Grid, cell: Cell): Point {
  return {
    x: grid.minX + (cell.cx + 0.5) * CELL_SIZE_MM,
    y: grid.minY + (cell.cy + 0.5) * CELL_SIZE_MM,
  };
}

/**
 * Rasterizes every wall into a blocked band on the grid, carving a
 * passable gap at each door opening on that wall — a real obstacle map,
 * not a decorative one (§16/§31). Assumes axis-aligned walls, the same
 * assumption `isAxisAlignedRectangle` relies on elsewhere in this app.
 * Windows do NOT open a gap: a surface-run cable can cross through a
 * doorway but not through a window.
 */
export function buildWallGrid(walls: Wall[], openings: Opening[]): Grid {
  const box = wallsBoundingBox(walls, CELL_SIZE_MM * 2);
  const cols = Math.max(1, Math.ceil(box.width / CELL_SIZE_MM));
  const rows = Math.max(1, Math.ceil(box.height / CELL_SIZE_MM));
  const grid: Grid = { minX: box.minX, minY: box.minY, cols, rows, blocked: new Uint8Array(cols * rows) };

  for (const wall of walls) {
    const dx = wall.end.x - wall.start.x;
    const dy = wall.end.y - wall.start.y;
    const horizontal = Math.abs(dx) >= Math.abs(dy);
    const half = wall.thickness / 2 + WALL_MARGIN_MM;
    const doorGaps = openings.filter((o) => o.wallId === wall.id && o.type === "door");

    if (horizontal) {
      const wallY = (wall.start.y + wall.end.y) / 2;
      const xMin = Math.min(wall.start.x, wall.end.x);
      const xMax = Math.max(wall.start.x, wall.end.x);
      const cyMin = Math.floor((wallY - half - grid.minY) / CELL_SIZE_MM);
      const cyMax = Math.floor((wallY + half - grid.minY) / CELL_SIZE_MM);
      const cxMin = Math.floor((xMin - grid.minX) / CELL_SIZE_MM);
      const cxMax = Math.floor((xMax - grid.minX) / CELL_SIZE_MM);
      for (let cy = cyMin; cy <= cyMax; cy++) {
        for (let cx = cxMin; cx <= cxMax; cx++) {
          if (!inBounds(grid, cx, cy)) continue;
          const worldX = grid.minX + (cx + 0.5) * CELL_SIZE_MM;
          const offsetAlongWall = dx >= 0 ? worldX - wall.start.x : wall.start.x - worldX;
          const inGap = doorGaps.some(
            (g) => offsetAlongWall >= g.offset - g.width / 2 && offsetAlongWall <= g.offset + g.width / 2,
          );
          if (!inGap) grid.blocked[cy * grid.cols + cx] = 1;
        }
      }
    } else {
      const wallX = (wall.start.x + wall.end.x) / 2;
      const yMin = Math.min(wall.start.y, wall.end.y);
      const yMax = Math.max(wall.start.y, wall.end.y);
      const cxMin = Math.floor((wallX - half - grid.minX) / CELL_SIZE_MM);
      const cxMax = Math.floor((wallX + half - grid.minX) / CELL_SIZE_MM);
      const cyMin = Math.floor((yMin - grid.minY) / CELL_SIZE_MM);
      const cyMax = Math.floor((yMax - grid.minY) / CELL_SIZE_MM);
      for (let cy = cyMin; cy <= cyMax; cy++) {
        for (let cx = cxMin; cx <= cxMax; cx++) {
          if (!inBounds(grid, cx, cy)) continue;
          const worldY = grid.minY + (cy + 0.5) * CELL_SIZE_MM;
          const offsetAlongWall = dy >= 0 ? worldY - wall.start.y : wall.start.y - worldY;
          const inGap = doorGaps.some(
            (g) => offsetAlongWall >= g.offset - g.width / 2 && offsetAlongWall <= g.offset + g.width / 2,
          );
          if (!inGap) grid.blocked[cy * grid.cols + cx] = 1;
        }
      }
    }
  }
  return grid;
}

/** A point often sits exactly on a wall's centerline (wall-mounted
 * devices, the distribution board) — spiral outward to the nearest
 * passable cell rather than failing the search. */
function nearestPassableCell(grid: Grid, from: Cell): Cell | null {
  if (!isBlocked(grid, from.cx, from.cy)) return from;
  for (let radius = 1; radius <= MAX_NUDGE_RADIUS; radius++) {
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== radius) continue;
        const cx = from.cx + dx;
        const cy = from.cy + dy;
        if (!isBlocked(grid, cx, cy)) return { cx, cy };
      }
    }
  }
  return null;
}

/** Minimal binary min-heap keyed by fScore — grids here run to a few
 * thousand cells, so a real heap (vs. a linear-scan open list) keeps A*
 * comfortably fast. */
class MinHeap<T> {
  private items: { key: number; value: T }[] = [];

  get size() {
    return this.items.length;
  }

  push(key: number, value: T) {
    this.items.push({ key, value });
    let i = this.items.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.items[parent].key <= this.items[i].key) break;
      [this.items[parent], this.items[i]] = [this.items[i], this.items[parent]];
      i = parent;
    }
  }

  pop(): T | undefined {
    const top = this.items[0];
    const last = this.items.pop();
    if (!top) return undefined;
    if (this.items.length > 0 && last) {
      this.items[0] = last;
      let i = 0;
      for (;;) {
        const left = i * 2 + 1;
        const right = i * 2 + 2;
        let smallest = i;
        if (left < this.items.length && this.items[left].key < this.items[smallest].key) smallest = left;
        if (right < this.items.length && this.items[right].key < this.items[smallest].key) smallest = right;
        if (smallest === i) break;
        [this.items[smallest], this.items[i]] = [this.items[i], this.items[smallest]];
        i = smallest;
      }
    }
    return top.value;
  }
}

const NEIGHBOR_OFFSETS: { dx: number; dy: number; cost: number }[] = [
  { dx: 1, dy: 0, cost: 1 },
  { dx: -1, dy: 0, cost: 1 },
  { dx: 0, dy: 1, cost: 1 },
  { dx: 0, dy: -1, cost: 1 },
  { dx: 1, dy: 1, cost: Math.SQRT2 },
  { dx: 1, dy: -1, cost: Math.SQRT2 },
  { dx: -1, dy: 1, cost: Math.SQRT2 },
  { dx: -1, dy: -1, cost: Math.SQRT2 },
];

function heuristic(a: Cell, b: Cell): number {
  return Math.hypot(a.cx - b.cx, a.cy - b.cy);
}

function aStar(grid: Grid, start: Cell, goal: Cell): Cell[] | null {
  const key = (c: Cell) => c.cy * grid.cols + c.cx;
  const goalKey = key(goal);
  const gScore = new Map<number, number>([[key(start), 0]]);
  const cameFrom = new Map<number, number>();
  const open = new MinHeap<Cell>();
  open.push(heuristic(start, goal), start);
  const visited = new Set<number>();

  while (open.size > 0) {
    const current = open.pop();
    if (!current) break;
    const currentKey = key(current);
    if (visited.has(currentKey)) continue;
    visited.add(currentKey);
    if (currentKey === goalKey) {
      const path: Cell[] = [current];
      let k = currentKey;
      while (cameFrom.has(k)) {
        k = cameFrom.get(k)!;
        path.push({ cx: k % grid.cols, cy: Math.floor(k / grid.cols) });
      }
      return path.reverse();
    }
    const currentG = gScore.get(currentKey) ?? Infinity;
    for (const { dx, dy, cost } of NEIGHBOR_OFFSETS) {
      const ncx = current.cx + dx;
      const ncy = current.cy + dy;
      if (isBlocked(grid, ncx, ncy)) continue;
      // Don't let a diagonal move cut through a blocked corner.
      if (dx !== 0 && dy !== 0 && (isBlocked(grid, current.cx + dx, current.cy) || isBlocked(grid, current.cx, current.cy + dy))) {
        continue;
      }
      const nKey = ncy * grid.cols + ncx;
      const tentativeG = currentG + cost;
      if (tentativeG < (gScore.get(nKey) ?? Infinity)) {
        gScore.set(nKey, tentativeG);
        cameFrom.set(nKey, currentKey);
        open.push(tentativeG + heuristic({ cx: ncx, cy: ncy }, goal), { cx: ncx, cy: ncy });
      }
    }
  }
  return null;
}

/** Drops collinear/near-collinear intermediate points so a straight
 * corridor renders as one segment instead of a staircase of grid steps. */
function simplifyPath(points: Point[]): Point[] {
  if (points.length <= 2) return points;
  const result: Point[] = [points[0]];
  for (let i = 1; i < points.length - 1; i++) {
    const prev = result[result.length - 1];
    const curr = points[i];
    const next = points[i + 1];
    const cross = (curr.x - prev.x) * (next.y - prev.y) - (curr.y - prev.y) * (next.x - prev.x);
    if (Math.abs(cross) > 1) result.push(curr);
  }
  result.push(points[points.length - 1]);
  return result;
}

/**
 * Real wall/door-aware pathfinding (§16/§31) for "Wand" routing mode — a
 * surface-mounted cable can't pass through a wall except at a doorway.
 * Falls back to a direct line only if the grid genuinely has no route
 * (e.g. a point sits fully outside the building envelope), never as a
 * silent shortcut for the normal case.
 */
export function findWallAwarePath(
  start: Point,
  end: Point,
  walls: Wall[],
  openings: Opening[],
): { path: Point[]; lengthMm: number } {
  const directLength = () => Math.abs(end.x - start.x) + Math.abs(end.y - start.y);
  if (walls.length === 0) return { path: [start, end], lengthMm: directLength() };

  const grid = buildWallGrid(walls, openings);
  const startCell = nearestPassableCell(grid, cellOf(grid, start));
  const endCell = nearestPassableCell(grid, cellOf(grid, end));
  if (!startCell || !endCell) return { path: [start, end], lengthMm: directLength() };

  const cellPath = aStar(grid, startCell, endCell);
  if (!cellPath) return { path: [start, end], lengthMm: directLength() };

  const worldPath = simplifyPath([start, ...cellPath.map((c) => worldOf(grid, c)), end]);
  let lengthMm = 0;
  for (let i = 1; i < worldPath.length; i++) {
    lengthMm += Math.hypot(worldPath[i].x - worldPath[i - 1].x, worldPath[i].y - worldPath[i - 1].y);
  }
  return { path: worldPath, lengthMm };
}
