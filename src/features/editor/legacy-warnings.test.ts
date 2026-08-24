import { test } from "node:test";
import assert from "node:assert/strict";
import { computeLegacyWarnings } from "./warnings.ts";
import type { ElectricalDevice, SmartHomeDevice } from "@/domain";

function makeDevice(overrides: Partial<ElectricalDevice> = {}): ElectricalDevice {
  return {
    id: "d1",
    floorId: "f1",
    type: "switch",
    mount: { position: { x: 0, y: 0 }, height: 1050 },
    roomId: "r1",
    number: 1,
    ...overrides,
  };
}

test("computeLegacyWarnings flags a device assigned to a legacy Loxone model", () => {
  const device = makeDevice({ smartHomeModelId: "loxone-miniserver-gen1" });
  const warnings = computeLegacyWarnings([device], [], null);
  assert.equal(warnings.length, 1);
  assert.match(warnings[0].message, /Legacy-Produkt/);
});

test("computeLegacyWarnings is silent for a current (non-legacy) model", () => {
  const device = makeDevice({ smartHomeModelId: "loxone-miniserver-gen2" });
  const warnings = computeLegacyWarnings([device], [], null);
  assert.equal(warnings.length, 0);
});

test("computeLegacyWarnings is silent when no smart-home model is assigned at all", () => {
  const warnings = computeLegacyWarnings([makeDevice()], [], null);
  assert.equal(warnings.length, 0);
});

test("computeLegacyWarnings flags a standalone smart-home device using a legacy model", () => {
  const device: SmartHomeDevice = {
    id: "sh1",
    floorId: "f1",
    systemId: "loxone",
    modelId: "loxone-miniserver-gen1",
    position: { x: 0, y: 0 },
    roomId: "r1",
    number: 1,
  };
  const warnings = computeLegacyWarnings([], [device], null);
  assert.equal(warnings.length, 1);
});

test("computeLegacyWarnings flags the distribution board when it uses a legacy model", () => {
  const board = {
    id: "board1",
    floorId: "f1",
    roomId: "r1",
    position: { x: 0, y: 0 },
    width: 400,
    height: 250,
    cabinetComponentModelIds: ["loxone-miniserver-gen1"],
  };
  const warnings = computeLegacyWarnings([], [], board);
  assert.equal(warnings.length, 1);
  assert.match(warnings[0].message, /Schaltschrank/);
});
