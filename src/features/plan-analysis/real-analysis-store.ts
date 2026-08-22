"use client";

import { create } from "zustand";
import type { RealAnalysisResult } from "./types";

interface RealAnalysisState {
  result: RealAnalysisResult | null;
  setResult: (result: RealAnalysisResult) => void;
  clear: () => void;
}

export const useRealAnalysisStore = create<RealAnalysisState>((set) => ({
  result: null,
  setResult: (result) => set({ result }),
  clear: () => set({ result: null }),
}));
