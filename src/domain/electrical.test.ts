import { test } from "node:test";
import assert from "node:assert/strict";
import { numberingPrefixFor, NETWORK_DEVICE_CABLE } from "./electrical.ts";

test("numberingPrefixFor defaults a network device with no subtype to the plain Dose prefix", () => {
  assert.equal(numberingPrefixFor({ type: "network" }), "LAN");
});

test("numberingPrefixFor gives each network subtype its own prefix", () => {
  assert.equal(numberingPrefixFor({ type: "network", networkDeviceSubtype: "access-point" }), "AP");
  assert.equal(numberingPrefixFor({ type: "network", networkDeviceSubtype: "camera" }), "CAM");
  assert.equal(numberingPrefixFor({ type: "network", networkDeviceSubtype: "door-intercom" }), "TS");
  assert.equal(numberingPrefixFor({ type: "network", networkDeviceSubtype: "poe-switch" }), "SW");
});

test("numberingPrefixFor still resolves other electrical types unaffected by the network subtype param", () => {
  assert.equal(numberingPrefixFor({ type: "outlet" }), "SD");
});

test("NETWORK_DEVICE_CABLE gives access points and cameras a duplex run, everything else a single CAT7", () => {
  assert.equal(NETWORK_DEVICE_CABLE["access-point"], "CAT7 Duplex");
  assert.equal(NETWORK_DEVICE_CABLE.camera, "CAT7 Duplex");
  assert.equal(NETWORK_DEVICE_CABLE.dose, "CAT7");
  assert.equal(NETWORK_DEVICE_CABLE["door-intercom"], "CAT7");
  assert.equal(NETWORK_DEVICE_CABLE["poe-switch"], "CAT7");
});
