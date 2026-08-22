import { getProjects } from "@/lib/mock-data";
import { NewProjectDialog } from "@/features/projects/NewProjectDialog";
import { ProjectsHydrator } from "@/features/projects/ProjectsHydrator";
import { ProjectsGrid } from "@/features/projects/ProjectsGrid";

export default async function ProjectsPage() {
  const projects = await getProjects();

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-8 py-8">
      <ProjectsHydrator projects={projects} />

      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-text">Projekte</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Alle Projekte in Ihrem Workspace.
          </p>
        </div>
        <NewProjectDialog />
      </div>

      <ProjectsGrid initialProjects={projects} />
    </div>
  );
}
