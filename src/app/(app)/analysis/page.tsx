import { ScanSearch } from "lucide-react";
import { getProjects, getProject } from "@/lib/mock-data";
import { getAnalysisForProject } from "@/features/plan-analysis/mock-analysis";
import { EntityProjectPicker } from "@/components/shell/EntityProjectPicker";
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
      <EntityProjectPicker
        title="KI-Analyse"
        subtitle="Wählen Sie ein Projekt, um den Original-vs-Digital-Vergleich zu öffnen."
        projects={projects}
        availableProjectIds={availability
          .filter((entry) => entry.available)
          .map((entry) => entry.id)}
        basePath="/analysis"
        icon={ScanSearch}
        availableLabel="Analyse öffnen"
        unavailableLabel="Noch keine Analyse"
      />
    );
  }

  const analysis = await getAnalysisForProject(project.id);
  if (!analysis) {
    return <NoAnalysisYet project={project} />;
  }

  return <AnalysisScreen project={project} analysis={analysis} />;
}
