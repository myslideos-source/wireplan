import { test } from "node:test";
import assert from "node:assert/strict";
import { findWallAwarePath } from "./pathfind.ts";
import type { Opening, Wall } from "@/domain";

// A single dividing wall down the middle of a 6m x 4m box, with a door
// near the top. Two points on opposite sides of the wall.
const dividingWall: Wall = {
  id: "w1",
  floorId: "f1",
  start: { x: 3000, y: 0 },
  end: { x: 3000, y: 4000 },
  thickness: 150,
  height: 2500,
};

// A box perimeter so the grid has bounds beyond just the dividing wall.
const perimeterWalls: Wall[] = [
  { id: "n", floorId: "f1", start: { x: 0, y: 0 }, end: { x: 6000, y: 0 }, thickness: 150, height: 2500 },
  { id: "s", floorId: "f1", start: { x: 0, y: 4000 }, end: { x: 6000, y: 4000 }, thickness: 150, height: 2500 },
  { id: "e", floorId: "f1", start: { x: 6000, y: 0 }, end: { x: 6000, y: 4000 }, thickness: 150, height: 2500 },
  { id: "w", floorId: "f1", start: { x: 0, y: 0 }, end: { x: 0, y: 4000 }, thickness: 150, height: 2500 },
  dividingWall,
];

const doorNearTop: Opening = { id: "d1", wallId: "w1", type: "door", offset: 400, width: 900 };
const start = { x: 1500, y: 2000 }; // left room
const end = { x: 4500, y: 2000 }; // right room, directly across the wall

test("findWallAwarePath routes through the doorway instead of crossing the wall directly", () => {
  const { path, lengthMm } = findWallAwarePath(start, end, perimeterWalls, [doorNearTop]);
  // A straight line would be 3000mm; going up to the door (near y=850)
  // and back down must be longer.
  const directLength = Math.hypot(end.x - start.x, end.y - start.y);
  assert.ok(lengthMm > directLength, "routed path must detour, not go straight through the wall");

  // The path should pass near the door's y-position (offset 400, width
  // 900 -> gap spans y in [-50, 850]) at some point while crossing x=3000.
  const nearWallCrossing = path.filter((p) => Math.abs(p.x - 3000) < 300);
  assert.ok(nearWallCrossing.length > 0, "path should have points near the dividing wall");
  const minYNearCrossing = Math.min(...nearWallCrossing.map((p) => p.y));
  assert.ok(minYNearCrossing < 1200, "path should rise toward the door gap, not stay at y=2000");
});

test("findWallAwarePath does not detour when there is no wall in the way", () => {
  const { path, lengthMm } = findWallAwarePath(start, end, [], []);
  assert.equal(path.length, 2);
  const directLength = Math.abs(end.x - start.x) + Math.abs(end.y - start.y);
  assert.equal(lengthMm, directLength);
});

test("findWallAwarePath finds a route even when a point sits on the wall centerline", () => {
  const onWall = { x: 3000, y: 2000 };
  const { path } = findWallAwarePath(start, onWall, perimeterWalls, [doorNearTop]);
  assert.ok(path.length >= 2);
});
