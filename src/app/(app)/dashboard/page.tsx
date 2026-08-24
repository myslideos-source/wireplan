import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  KpiCard,
  Stepper,
} from "@/components/ui";
import { getPrimaryProject, getProjects } from "@/lib/mock-data";
import { formatLength } from "@/lib/utils";
import { ProjectHeroCard } from "@/features/projects/ProjectCard";
import { NewProjectDialog } from "@/features/projects/NewProjectDialog";
import { ProjectsHydrator } from "@/features/projects/ProjectsHydrator";
import { UploadPlanDialog } from "@/features/plan-upload/UploadPlanDialog";

export default async function DashboardPage() {
  const [project, projects] = await Promise.all([
    getPrimaryProject(),
    getProjects(),
  ]);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-8 py-8">
      <ProjectsHydrator projects={projects} />

      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold text-text">
            Willkommen zurück
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Hier ist der aktuelle Stand Ihrer Projekte.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <UploadPlanDialog project={project} />
          <NewProjectDialog />
        </div>
      </div>

      <ProjectHeroCard project={project} />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <KpiCard label="Stockwerke" value={String(project.kpis.floors)} />
        <KpiCard label="Räume" value={String(project.kpis.rooms)} />
        <KpiCard label="Geräte" value={String(project.kpis.devices)} />
        <KpiCard
          label="Kabellänge"
          value={formatLength(project.kpis.cableLengthMeters)}
        />
        <KpiCard label="Stromkreise" value={String(project.kpis.circuits)} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Projektfortschritt</CardTitle>
        </CardHeader>
        <CardContent className="py-6">
          <Stepper steps={project.stages} />
        </CardContent>
      </Card>
    </div>
  );
}
