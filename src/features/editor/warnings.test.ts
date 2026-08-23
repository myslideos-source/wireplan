import { test } from "node:test";
import assert from "node:assert/strict";
import { computeCircuitWarnings } from "./warnings.ts";
import type { ElectricalDevice, Room } from "@/domain";

function makeDevice(overrides: Partial<ElectricalDevice> & { roomId: string | null }): ElectricalDevice {
  return {
    id: "d1",
    floorId: "f1",
    type: "outlet",
    mount: { kind: "wall", wallId: "w1", offset: 0, height: 300 },
    number: 1,
    ...overrides,
  };
}

const room: Room = { id: "r1", floorId: "f1", name: "Küche", type: "Küche", polygon: [], area: 0, height: 2500 };

test("computeCircuitWarnings flags a room with devices but no assigned circuit", () => {
  const warnings = computeCircuitWarnings([room], [makeDevice({ roomId: "r1" })], {});
  assert.equal(warnings.length, 1);
  assert.match(warnings[0].message, /Küche/);
});

test("computeCircuitWarnings is silent once the room has a circuit", () => {
  const warnings = computeCircuitWarnings([room], [makeDevice({ roomId: "r1" })], { r1: "l1" });
  assert.equal(warnings.length, 0);
});

test("computeCircuitWarnings ignores devices with no room (outside any polygon)", () => {
  const warnings = computeCircuitWarnings([room], [makeDevice({ roomId: null })], {});
  assert.equal(warnings.length, 0);
});
