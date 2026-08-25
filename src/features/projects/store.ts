"use client";

import { create } from "zustand";
import type { Project } from "@/domain";
import { defaultProjectStages, emptyProjectKpis } from "@/domain";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { insertProject } from "@/lib/supabase/projects";

interface ProjectsState {
  projects: Project[];
  hydrated: boolean;
  hydrate: (projects: Project[]) => void;
  addProject: (input: { name: string; address: string }) => Project;
  advanceToValidation: (projectId: string) => void;
}

function createEmptyProject(input: { name: string; address: string }): Project {
  return {
    id: crypto.randomUUID(),
    name: input.name,
    address: input.address,
    geometryStatus: "DRAFT",
    updatedAt: new Date().toISOString(),
    stages: defaultProjectStages(),
    kpis: emptyProjectKpis(),
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
    // Fire-and-forget — if no Supabase project is configured this is a
    // no-op (createSupabaseBrowserClient returns null) and the project
    // simply stays client-memory-only for this session, same as before.
    const supabase = createSupabaseBrowserClient();
    if (supabase) {
      insertProject(supabase, { id: project.id, name: project.name, address: project.address });
    }
    return project;
  },
  advanceToValidation: (projectId) => {
    set((state) => ({
      projects: state.projects.map((project) => {
        if (project.id !== projectId) return project;
        return {
          ...project,
          geometryStatus:
            project.geometryStatus === "DRAFT"
              ? "IN_REVIEW"
              : project.geometryStatus,
          updatedAt: new Date().toISOString(),
          stages: project.stages.map((stage) => {
            if (stage.id === "analyze") return { ...stage, status: "done" };
            if (stage.id === "validate") return { ...stage, status: "active" };
            return stage;
          }),
        };
      }),
    }));
    const supabase = createSupabaseBrowserClient();
    if (supabase) {
      supabase
        .from("projects")
        .update({ geometry_status: "IN_REVIEW", updated_at: new Date().toISOString() })
        .eq("id", projectId)
        .eq("geometry_status", "DRAFT");
    }
  },
}));
