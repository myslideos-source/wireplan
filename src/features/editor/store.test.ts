import { test } from "node:test";
import assert from "node:assert/strict";
import { useEditorStore, computeLiveProjectKpis } from "./store.ts";
import type { FloorGeometry } from "./mock-geometry.ts";

test("closeRoomDraw rejects fewer than 3 points", () => {
  const store = useEditorStore.getState();
  store.cancelRoomDraw();
  store.addRoomDrawPoint({ x: 0, y: 0 });
  store.addRoomDrawPoint({ x: 4000, y: 0 });
  const roomsBefore = useEditorStore.getState().rooms.length;
  const closed = useEditorStore.getState().closeRoomDraw();
  assert.equal(closed, false);
  assert.equal(useEditorStore.getState().rooms.length, roomsBefore);
  assert.notEqual(useEditorStore.getState().drawingRoomPoints, null);
  store.cancelRoomDraw();
});

test("closeRoomDraw accepts an arbitrary non-rectangular polygon with 3+ points", () => {
  const store = useEditorStore.getState();
  store.cancelRoomDraw();
  store.addRoomDrawPoint({ x: 0, y: 0 });
  store.addRoomDrawPoint({ x: 4000, y: 0 });
  store.addRoomDrawPoint({ x: 2000, y: 3000 });
  const roomsBefore = useEditorStore.getState().rooms.length;
  const closed = useEditorStore.getState().closeRoomDraw("Dreieckszimmer");
  assert.equal(closed, true);
  const state = useEditorStore.getState();
  assert.equal(state.rooms.length, roomsBefore + 1);
  const newRoom = state.rooms[state.rooms.length - 1];
  assert.equal(newRoom.name, "Dreieckszimmer");
  assert.equal(newRoom.polygon.length, 3);
  assert.equal(state.drawingRoomPoints, null);
  assert.equal(state.selected?.type, "room");
});

test("cancelRoomDraw discards the in-progress polygon without creating a room", () => {
  const store = useEditorStore.getState();
  store.cancelRoomDraw();
  store.addRoomDrawPoint({ x: 0, y: 0 });
  store.addRoomDrawPoint({ x: 1000, y: 0 });
  store.addRoomDrawPoint({ x: 500, y: 1000 });
  const roomsBefore = useEditorStore.getState().rooms.length;
  store.cancelRoomDraw();
  const state = useEditorStore.getState();
  assert.equal(state.drawingRoomPoints, null);
  assert.equal(state.rooms.length, roomsBefore);
});

function makeFloorGeometry(floorId: string, projectId: string, name: string): FloorGeometry {
  return { floor: { id: floorId, projectId, name, level: 0 }, rooms: [] };
}

test("computeLiveProjectKpis aggregates rooms/devices/cable length across every floor, without double-counting the active one after switching back", () => {
  const store = useEditorStore.getState();
  store.hydrate([makeFloorGeometry("floorA", "kpi-test-project", "EG")]);

  store.addRoomDrawPoint({ x: 0, y: 0 });
  store.addRoomDrawPoint({ x: 4000, y: 0 });
  store.addRoomDrawPoint({ x: 4000, y: 4000 });
  store.addRoomDrawPoint({ x: 0, y: 4000 });
  store.closeRoomDraw("Wohnzimmer");
  store.addDeviceAtPoint("outlet", { x: 1000, y: 1000 });
  store.addDeviceAtPoint("outlet", { x: 2000, y: 1000 });

  const room = useEditorStore.getState().rooms[0];
  store.setTechnikraum(room.id);
  store.placeDistributionBoard({ x: 500, y: 500 });
  store.calculateRouting();

  const singleFloor = computeLiveProjectKpis(useEditorStore.getState());
  assert.equal(singleFloor.floors, 1);
  assert.equal(singleFloor.rooms, 1);
  assert.equal(singleFloor.devices, 2);
  assert.ok(singleFloor.cableLengthMeters > 0, "the two looped outlets should produce a real cable length");

  store.addFloor({ name: "OG", level: 1 });
  store.addDeviceAtPoint("light", { x: 1000, y: 1000 });

  const twoFloors = computeLiveProjectKpis(useEditorStore.getState());
  assert.equal(twoFloors.floors, 2);
  assert.equal(twoFloors.devices, 3, "2 outlets on EG + 1 light on OG");
  assert.equal(twoFloors.rooms, 1, "only EG has a room drawn");

  // switchFloor never deletes the floor it just read from floorCache, so
  // the entry for "floorA" is still sitting there after this switch —
  // computeLiveProjectKpis must exclude it (it's the same floor as the
  // live top-level state now) rather than counting it a second time.
  store.switchFloor("floorA");
  const afterSwitchingBack = computeLiveProjectKpis(useEditorStore.getState());
  assert.equal(afterSwitchingBack.devices, 3);
  assert.equal(afterSwitchingBack.rooms, 1);
});
