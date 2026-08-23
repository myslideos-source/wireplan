import { test } from "node:test";
import assert from "node:assert/strict";
import { useEditorStore } from "./store.ts";

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
