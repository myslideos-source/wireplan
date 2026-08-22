"use client";

import { create } from "zustand";
import type { Project } from "@/domain";
import type { FloorGeometry } from "@/features/editor/mock-geometry";
import type { FlaggedArea } from "./types";

interface AiDraft {
  project: Project;
  geometry: FloorGeometry;
  flaggedAreas: FlaggedArea[];
}

interface AiDraftState {
  draft: AiDraft | null;
  setDraft: (draft: AiDraft) => void;
  clear: () => void;
}

export const useAiDraftStore = create<AiDraftState>((set) => ({
  draft: null,
  setDraft: (draft) => set({ draft }),
  clear: () => set({ draft: null }),
}));
