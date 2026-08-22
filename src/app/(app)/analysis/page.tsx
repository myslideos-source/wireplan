import { getProjects, getProject } from "@/lib/mock-data";
import { getAnalysisForProject } from "@/features/plan-analysis/mock-analysis";
import { ProjectPicker } from "@/features/plan-analysis/ProjectPicker";
import { AnalysisScreen } from "@/features/plan-analysis/AnalysisScreen";
import { NoAnalysisYet } from "@/features/plan-analysis/NoAnalysisYet";

export default async function AnalysisPage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string }>;
}) {
  const { project: projectId } = await searchParams;
  const projects = await getProjects();
  const project = projectId ? await getProject(projectId) : undefined;

  if (!project) {
    const availability = await Promise.all(
      projects.map(async (p) => ({
        id: p.id,
        available: Boolean(await getAnalysisForProject(p.id)),
      })),
    );
    return (
      <ProjectPicker
        projects={projects}
        availableProjectIds={availability
          .filter((entry) => entry.available)
          .map((entry) => entry.id)}
      />
    );
  }

  const analysis = await getAnalysisForProject(project.id);
  if (!analysis) {
    return <NoAnalysisYet project={project} />;
  }

  return <AnalysisScreen project={project} analysis={analysis} />;
}
