"use client";

import { create } from "zustand";
import type { Wall, Room, Opening } from "@/domain";
import { polygonAreaSqMeters } from "@/domain";
import type { FloorGeometry } from "./mock-geometry";

export type EditorTool =
  | "select"
  | "wall"
  | "room"
  | "outlet"
  | "light"
  | "switch"
  | "sensor"
  | "network"
  | "smarthome"
  | "cable";

export type LayerId = "grundriss" | "elektro" | "kabelwege" | "beschriftung";

export type Selection =
  | { type: "room"; id: string }
  | { type: "wall"; id: string }
  | null;

interface EditorState {
  floorId: string | null;
  walls: Wall[];
  rooms: Room[];
  openings: Opening[];
  hydrate: (geometry: FloorGeometry) => void;

  selected: Selection;
  select: (selection: Selection) => void;

  activeTool: EditorTool;
  setTool: (tool: EditorTool) => void;

  layers: Record<LayerId, boolean>;
  toggleLayer: (layer: LayerId) => void;

  zoom: number;
  setZoom: (updater: number | ((zoom: number) => number)) => void;

  updateRoom: (id: string, patch: Partial<Pick<Room, "name" | "type" | "height">>) => void;
  updateWallThickness: (id: string, thicknessMm: number) => void;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  floorId: null,
  walls: [],
  rooms: [],
  openings: [],
  hydrate: (geometry) => {
    // Re-hydrate whenever a different floor's geometry is passed in (e.g.
    // navigating from one project's editor to another's without a full
    // page reload) but skip redundant resets of in-progress edits.
    if (get().floorId === geometry.floor.id) return;
    set({
      floorId: geometry.floor.id,
      walls: geometry.walls,
      rooms: geometry.rooms,
      openings: geometry.openings,
      selected: null,
    });
  },

  selected: null,
  select: (selection) => set({ selected: selection }),

  activeTool: "select",
  setTool: (tool) => set({ activeTool: tool }),

  layers: { grundriss: true, elektro: true, kabelwege: true, beschriftung: true },
  toggleLayer: (layer) =>
    set((state) => ({ layers: { ...state.layers, [layer]: !state.layers[layer] } })),

  zoom: 1,
  setZoom: (updater) =>
    set((state) => ({
      zoom: Math.min(
        3,
        Math.max(
          0.4,
          typeof updater === "function" ? updater(state.zoom) : updater,
        ),
      ),
    })),

  updateRoom: (id, patch) =>
    set((state) => ({
      rooms: state.rooms.map((room) =>
        room.id === id ? { ...room, ...patch } : room,
      ),
    })),

  updateWallThickness: (id, thicknessMm) =>
    set((state) => ({
      walls: state.walls.map((wall) =>
        wall.id === id ? { ...wall, thickness: thicknessMm } : wall,
      ),
    })),
}));

export function roomAreaSqMeters(room: Room): number {
  return polygonAreaSqMeters(room.polygon);
}
