"use client";

import { create } from "zustand";
import type { RealAnalysisResult } from "./types";

interface RealAnalysisState {
  result: RealAnalysisResult | null;
  /** Which project this analysis was run for — lets the screen offer a
   * direct "weiter zum Editor" link instead of leaving the user with no
   * way back into the project after reading the analysis. */
  projectId: string | null;
  setResult: (result: RealAnalysisResult, projectId: string) => void;
  clear: () => void;
}

export const useRealAnalysisStore = create<RealAnalysisState>((set) => ({
  result: null,
  projectId: null,
  setResult: (result, projectId) => set({ result, projectId }),
  clear: () => set({ result: null, projectId: null }),
}));
