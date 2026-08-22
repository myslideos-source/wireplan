"use client";

import { useEffect } from "react";
import type { Project } from "@/domain";
import { useProjectsStore } from "./store";

export function ProjectsHydrator({ projects }: { projects: Project[] }) {
  const hydrate = useProjectsStore((state) => state.hydrate);

  useEffect(() => {
    hydrate(projects);
  }, [hydrate, projects]);

  return null;
}
