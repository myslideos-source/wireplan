import { Cable } from "lucide-react";
import { getProjects, getProject } from "@/lib/mock-data";
import { EntityProjectPicker } from "@/components/shell/EntityProjectPicker";
import { RoutingGate } from "@/features/routing/RoutingGate";

export default async function RoutingPage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string }>;
}) {
  const { project: projectId } = await searchParams;
  const projects = await getProjects();
  const project = projectId ? await getProject(projectId) : undefined;

  if (!project) {
    // Whether a project actually has floors is client-only state (the
    // editor store) until real persistence exists — this picker can't
    // know that server-side, so every project is offered; RoutingGate
    // shows the honest "open the editor first" message per project.
    return (
      <EntityProjectPicker
        title="Kabelrouting"
        subtitle="Wählen Sie ein Projekt, um Kabelwege zu berechnen."
        projects={projects}
        availableProjectIds={projects.map((p) => p.id)}
        basePath="/routing"
        icon={Cable}
        availableLabel="Routing öffnen"
        unavailableLabel="Kein Grundriss"
      />
    );
  }

  return <RoutingGate project={project} />;
}
