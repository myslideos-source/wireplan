"use client";

import type { Project } from "@/domain";
import { useProjectsStore } from "./store";
import { ProjectGridCard } from "./ProjectCard";

export function ProjectsGrid({
  initialProjects,
}: {
  initialProjects: Project[];
}) {
  const storeProjects = useProjectsStore((state) => state.projects);
  const projects = storeProjects.length > 0 ? storeProjects : initialProjects;

  if (projects.length === 0) {
    return (
      <p className="text-sm text-text-secondary">
        Noch keine Projekte vorhanden. Legen Sie Ihr erstes Projekt an.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {projects.map((project) => (
        <ProjectGridCard key={project.id} project={project} />
      ))}
    </div>
  );
}
