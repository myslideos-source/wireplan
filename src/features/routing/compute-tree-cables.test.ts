import { test } from "node:test";
import assert from "node:assert/strict";
import { orderTreeBusPoints, treeBusLengthMeters } from "./compute-tree-cables.ts";

test("orderTreeBusPoints walks to the nearest remaining point each step", () => {
  const start = { x: 0, y: 0 };
  const points = [
    { id: "far", position: { x: 5000, y: 0 } },
    { id: "near", position: { x: 1000, y: 0 } },
    { id: "middle", position: { x: 3000, y: 0 } },
  ];
  const ordered = orderTreeBusPoints(start, points);
  assert.deepEqual(
    ordered.map((p) => p.id),
    ["near", "middle", "far"],
  );
});

test("treeBusLengthMeters sums consecutive hops as one shared bus, not a star", () => {
  const start = { x: 0, y: 0 };
  const ordered = [
    { id: "a", position: { x: 1000, y: 0 } },
    { id: "b", position: { x: 1000, y: 2000 } },
  ];
  // A star (board -> a, board -> b) would total 1m + sqrt(1^2+2^2)... this
  // bus instead walks board -> a -> b: 1m + 2m = 3m.
  assert.equal(treeBusLengthMeters(start, ordered), 3);
});
