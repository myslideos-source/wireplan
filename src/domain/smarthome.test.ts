import { test } from "node:test";
import assert from "node:assert/strict";
import { LOXONE_CATALOG, PLANNING_CATEGORY_LABELS, type SmartHomeIconKey } from "./smarthome.ts";
import { SMART_HOME_ICONS } from "../features/editor/smart-home-icons.ts";

test("every LOXONE_CATALOG entry has a unique id", () => {
  const ids = LOXONE_CATALOG.map((model) => model.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("every LOXONE_CATALOG entry has non-empty color, description and a planningCategory with a label", () => {
  for (const model of LOXONE_CATALOG) {
    assert.ok(model.color.length > 0, `${model.id} has no color`);
    assert.ok(model.description.length > 0, `${model.id} has no description`);
    assert.ok(PLANNING_CATEGORY_LABELS[model.planningCategory], `${model.id} has an unlabeled planningCategory`);
  }
});

test("every LOXONE_CATALOG entry's icon resolves to a real component in SMART_HOME_ICONS", () => {
  for (const model of LOXONE_CATALOG) {
    const icon: SmartHomeIconKey = model.icon;
    assert.ok(SMART_HOME_ICONS[icon], `${model.id} references unknown icon key "${model.icon}"`);
  }
});

test("no entry is both floorplan-placeable and a cabinet component at once", () => {
  // Usually exactly one is true (a room device vs. cabinet hardware);
  // a handheld remote you carry around is a legitimate third case where
  // neither applies, so this only rules out the genuinely contradictory
  // combination, not "neither".
  for (const model of LOXONE_CATALOG) {
    assert.ok(
      !(model.isPlanableOnFloorplan && model.isCabinetComponent),
      `${model.id} cannot be both floorplan-placeable and a cabinet component`,
    );
  }
});

test("a wireless (Air/WiFi) entry never claims a cableType, since it has no cable of its own", () => {
  for (const model of LOXONE_CATALOG) {
    if (model.connectionType === "Air" || model.connectionType === "WiFi") {
      assert.equal(model.cableType, undefined, `${model.id} is wireless but declares a cableType`);
    }
  }
});
