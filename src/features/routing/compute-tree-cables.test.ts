import { test } from "node:test";
import assert from "node:assert/strict";
import { orderTreeBusPoints, treeBusLengthMeters, computeTreeBranchCables } from "./compute-tree-cables.ts";
import type { DistributionBoard, ElectricalDevice, TreeBranch, TreeEdge, TreeJunction } from "@/domain";

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

const board: DistributionBoard = { id: "board1", floorId: "f1", roomId: "r1", position: { x: 0, y: 0 }, width: 400, height: 250 };
const branch: TreeBranch = { id: "b1", floorId: "f1", label: "Tree 1", colorHex: "#68d56b" };

function makeDevice(id: string, position: { x: number; y: number }): ElectricalDevice {
  return {
    id,
    floorId: "f1",
    type: "switch",
    mount: { position, height: 1050 },
    roomId: "r1",
    smartHomeModelId: "loxone-relay-tree",
    treeBranchId: branch.id,
    number: 1,
  };
}

test("computeTreeBranchCables sums manually-drawn edges instead of the auto chain when a branch has any (§61)", () => {
  const d1 = makeDevice("d1", { x: 1000, y: 0 });
  const d2 = makeDevice("d2", { x: 2000, y: 1000 });
  const junction: TreeJunction = { id: "j1", floorId: "f1", treeBranchId: branch.id, position: { x: 2000, y: 0 } };
  const edges: TreeEdge[] = [
    { id: "e1", treeBranchId: branch.id, fromRef: "board", toRef: "junction:j1" },
    { id: "e2", treeBranchId: branch.id, fromRef: "junction:j1", toRef: "device:d1" },
    { id: "e3", treeBranchId: branch.id, fromRef: "junction:j1", toRef: "device:d2" },
  ];
  const cables = computeTreeBranchCables([branch], [d1, d2], [], board, "Decke", [junction], edges);
  assert.equal(cables.length, 1);
  // board->junction 2000mm=2m, junction->d1 1000mm=1m, junction->d2 1000mm=1m => 4m — a
  // real Y-branch through the junction, not a single chain a nearest-neighbor
  // ordering could ever represent (it would have to pick one device to detour via).
  assert.equal(cables[0].lengthMeters, 4);
  assert.match(cables[0].targetLabel, /manuell verbunden/);
});

test("computeTreeBranchCables falls back to the automatic nearest-neighbor chain when a branch has no manual edges", () => {
  const d1 = makeDevice("d1", { x: 1000, y: 0 });
  const cables = computeTreeBranchCables([branch], [d1], [], board, "Decke");
  assert.equal(cables.length, 1);
  assert.equal(cables[0].lengthMeters, 1);
  assert.doesNotMatch(cables[0].targetLabel, /manuell verbunden/);
});
