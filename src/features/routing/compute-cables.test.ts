import { test } from "node:test";
import assert from "node:assert/strict";
import { computeCables, circuitGroupKeyFor } from "./compute-cables.ts";
import type { DistributionBoard, ElectricalDevice, Room } from "@/domain";

const board: DistributionBoard = {
  id: "board1",
  floorId: "f1",
  roomId: "technik",
  position: { x: 0, y: 0 },
  width: 400,
  height: 250,
  cabinetComponentModelIds: [],
};

const room1: Room = {
  id: "r1",
  floorId: "f1",
  name: "Wohnzimmer",
  type: "living",
  polygon: [],
  area: 20,
  height: 2.5,
};
const room2: Room = {
  id: "r2",
  floorId: "f1",
  name: "Flur",
  type: "hallway",
  polygon: [],
  area: 8,
  height: 2.5,
};

function makeDevice(overrides: Partial<ElectricalDevice> = {}): ElectricalDevice {
  return {
    id: "d1",
    floorId: "f1",
    type: "outlet",
    mount: { position: { x: 1000, y: 0 }, height: 300 },
    roomId: "r1",
    number: 1,
    ...overrides,
  };
}

test("computeCables loops outlets in the same room through one shared cable instead of a home-run each (§Phase15)", () => {
  const d1 = makeDevice({ id: "d1", mount: { position: { x: 1000, y: 0 }, height: 300 } });
  const d2 = makeDevice({ id: "d2", mount: { position: { x: 2000, y: 0 }, height: 300 } });
  const cables = computeCables([d1, d2], board, [room1], "Boden");
  assert.equal(cables.length, 1);
  assert.deepEqual(cables[0].deviceIds, ["d1", "d2"]);
  // board->d1 1m, d1->d2 1m => 2m, a real loop, not two 1-2m home-runs.
  assert.equal(cables[0].lengthMeters, 2);
  assert.match(cables[0].targetLabel, /durchgeschleift/);
  assert.equal(cables[0].kind, "power");
});

test("computeCables folds a light/switch in the same room into the same loop as the outlets", () => {
  const outlet = makeDevice({ id: "d1", type: "outlet", mount: { position: { x: 1000, y: 0 }, height: 300 } });
  const light = makeDevice({ id: "d2", type: "light", mount: { position: { x: 1000, y: 1000 }, height: 2700 } });
  const cables = computeCables([outlet, light], board, [room1], "Boden");
  assert.equal(cables.length, 1);
  assert.equal(cables[0].deviceIds?.length, 2);
});

test("computeCables keeps sensors and network devices on their own individual home-run cable", () => {
  const sensor = makeDevice({ id: "d1", type: "sensor", mount: { position: { x: 1000, y: 0 }, height: 2700 } });
  const network = makeDevice({ id: "d2", type: "network", mount: { position: { x: 2000, y: 0 }, height: 300 } });
  const cables = computeCables([sensor, network], board, [room1], "Boden");
  assert.equal(cables.length, 2);
  assert.ok(cables.every((c) => c.deviceId));
  assert.ok(cables.every((c) => !c.deviceIds));
  // §112 — never looped in the routing view either, both get their own
  // "network" group so they're never mistaken for a durchgeschleift circuit.
  assert.ok(cables.every((c) => c.kind === "network"));
});

test("computeCables loops two different rooms together when both are assigned to the same circuit", () => {
  const d1 = makeDevice({ id: "d1", roomId: "r1", mount: { position: { x: 1000, y: 0 }, height: 300 } });
  const d2 = makeDevice({ id: "d2", roomId: "r2", mount: { position: { x: 2000, y: 0 }, height: 300 } });
  const roomCircuits = { r1: "l1", r2: "l1" };
  const cables = computeCables([d1, d2], board, [room1, room2], "Boden", roomCircuits);
  assert.equal(cables.length, 1);
  assert.equal(cables[0].deviceIds?.length, 2);
  assert.match(cables[0].targetLabel, /Wohnzimmer/);
  assert.match(cables[0].targetLabel, /Flur/);
});

test("computeCables keeps two rooms separate when only one has a circuit assigned to the other", () => {
  const d1 = makeDevice({ id: "d1", roomId: "r1", mount: { position: { x: 1000, y: 0 }, height: 300 } });
  const d2 = makeDevice({ id: "d2", roomId: "r2", mount: { position: { x: 2000, y: 0 }, height: 300 } });
  const cables = computeCables([d1, d2], board, [room1, room2], "Boden", { r1: "l1" });
  assert.equal(cables.length, 2);
});

test("circuitGroupKeyFor groups by explicit circuit, falls back to room, then to the device itself", () => {
  const inCircuit = makeDevice({ id: "d1", roomId: "r1" });
  const inRoomOnly = makeDevice({ id: "d2", roomId: "r2" });
  const noRoom = makeDevice({ id: "d3", roomId: null });
  assert.equal(circuitGroupKeyFor(inCircuit, { r1: "l1" }), "circuit:l1");
  assert.equal(circuitGroupKeyFor(inRoomOnly, { r1: "l1" }), "room:r2");
  assert.equal(circuitGroupKeyFor(noRoom, {}), "device:d3");
});
