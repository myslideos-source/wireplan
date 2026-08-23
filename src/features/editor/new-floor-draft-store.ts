"use client";

import { create } from "zustand";
import type { Project } from "@/domain";
import type { FloorGeometry } from "./mock-geometry";

interface NewFloorDraft {
  project: Project;
  geometry: FloorGeometry;
  /** The uploaded plan image, applied as the floor's locked background
   * once the editor has hydrated — held here rather than baked into
   * `geometry` because a floor's background image is runtime store state,
   * not part of its seed geometry (see `BackgroundImage` in store.ts). */
  backgroundImage?: { dataUrl: string; naturalWidth: number; naturalHeight: number };
}

interface NewFloorDraftState {
  draft: NewFloorDraft | null;
  setDraft: (draft: NewFloorDraft) => void;
  clear: () => void;
}

/** Holds a brand-new locked-raster floor between its creation dialog
 * (`StartFloorDialog`) and the editor route that opens it — lives only in
 * the browser, cleared on reload, same as the AI-analysis result store. */
export const useNewFloorDraftStore = create<NewFloorDraftState>((set) => ({
  draft: null,
  setDraft: (draft) => set({ draft }),
  clear: () => set({ draft: null }),
}));
