import { test } from "node:test";
import assert from "node:assert/strict";
import { floorExtentBox } from "./geometry-utils.ts";
import type { Room } from "@/domain";

const room: Room = {
  id: "r1",
  floorId: "f1",
  name: "Wohnen",
  type: "Wohnzimmer",
  polygon: [
    { x: 0, y: 0 },
    { x: 4000, y: 0 },
    { x: 4000, y: 3000 },
    { x: 0, y: 3000 },
  ],
  area: 12,
  height: 2500,
};

test("floorExtentBox fits around drawn room zones when rooms exist", () => {
  const box = floorExtentBox([room], null, 900);
  assert.equal(box.minX, -900);
  assert.equal(box.minY, -900);
  assert.equal(box.width, 4000 + 1800);
  assert.equal(box.height, 3000 + 1800);
});

test("floorExtentBox falls back to the background image's own extent when there are no rooms yet", () => {
  const box = floorExtentBox([], { x: 100, y: 200, width: 5000, height: 4000 }, 0);
  assert.equal(box.minX, 100);
  assert.equal(box.minY, 200);
  assert.equal(box.width, 5000);
  assert.equal(box.height, 4000);
});

test("floorExtentBox falls back to a fixed default box for a brand-new, still-empty floor", () => {
  const box = floorExtentBox([], null, 900);
  assert.equal(box.minX, 0);
  assert.equal(box.minY, 0);
  assert.equal(box.width, 10000);
  assert.equal(box.height, 10000);
});
