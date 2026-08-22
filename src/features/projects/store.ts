"use client";

import { create } from "zustand";
import type { Project } from "@/domain";

interface ProjectsState {
  projects: Project[];
  hydrated: boolean;
  hydrate: (projects: Project[]) => void;
  addProject: (input: { name: string; address: string }) => Project;
}

function createEmptyProject(input: { name: string; address: string }): Project {
  return {
    id: `proj-${Date.now()}`,
    name: input.name,
    address: input.address,
    geometryStatus: "DRAFT",
    updatedAt: new Date().toISOString(),
    stages: [
      { id: "upload", label: "Grundriss hochladen", status: "active" },
      { id: "analyze", label: "Analysieren", status: "pending" },
      { id: "validate", label: "Validieren", status: "pending" },
      { id: "electrical", label: "Elektroplanung", status: "pending" },
      { id: "routing", label: "Routing", status: "pending" },
      { id: "export", label: "Export", status: "pending" },
    ],
    kpis: {
      floors: 0,
      rooms: 0,
      devices: 0,
      cableLengthMeters: 0,
      circuits: 0,
    },
  };
}

export const useProjectsStore = create<ProjectsState>((set, get) => ({
  projects: [],
  hydrated: false,
  hydrate: (projects) => {
    if (get().hydrated) return;
    set({ projects, hydrated: true });
  },
  addProject: (input) => {
    const project = createEmptyProject(input);
    set((state) => ({ projects: [project, ...state.projects] }));
    return project;
  },
}));
