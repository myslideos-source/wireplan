import { test } from "node:test";
import assert from "node:assert/strict";
import { computeConsumerCables } from "./compute-consumer-cables.ts";
import type { DistributionBoard, FixedConsumer } from "@/domain";

const board: DistributionBoard = {
  id: "board1",
  floorId: "f1",
  roomId: "r1",
  position: { x: 0, y: 0 },
  width: 400,
  height: 250,
  cabinetComponentModelIds: [],
};

function makeConsumer(overrides: Partial<FixedConsumer> = {}): FixedConsumer {
  return {
    id: "c1",
    floorId: "f1",
    type: "wallbox",
    position: { x: 1000, y: 0 },
    roomId: "r1",
    cableType: "NYM-J 5x6",
    reserveConduit: false,
    number: 1,
    ...overrides,
  };
}

test("computeConsumerCables emits only the lead cable when reserveConduit is off", () => {
  const cables = computeConsumerCables([makeConsumer()], board, "Boden");
  assert.equal(cables.length, 1);
  assert.equal(cables[0].type, "NYM-J 5x6");
});

test("computeConsumerCables emits an extra same-length Leerrohr M25 cable when reserveConduit is on", () => {
  const cables = computeConsumerCables([makeConsumer({ reserveConduit: true })], board, "Boden");
  assert.equal(cables.length, 2);
  const reserve = cables.find((c) => c.type === "Leerrohr M25");
  assert.ok(reserve);
  assert.equal(reserve.lengthMeters, cables[0].lengthMeters);
  assert.match(reserve.targetLabel, /Reserve-Leerrohr/);
});
