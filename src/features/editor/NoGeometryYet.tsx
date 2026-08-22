import Link from "next/link";
import { Building2 } from "lucide-react";
import { Card } from "@/components/ui";
import type { Project } from "@/domain";

export function NoGeometryYet({ project }: { project: Project }) {
  return (
    <div className="flex h-full items-center justify-center p-8">
      <Card className="flex max-w-md flex-col items-center gap-4 px-8 py-10 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary/10 text-secondary">
          <Building2 className="h-6 w-6" />
        </span>
        <div>
          <h2 className="text-base font-semibold text-text">
            Noch kein digitaler Grundriss für {project.name}
          </h2>
          <p className="mt-2 text-sm text-text-secondary">
            Laden Sie einen Grundriss hoch und bestätigen Sie die KI-Analyse,
            bevor der Editor geöffnet werden kann.
          </p>
        </div>
        <Link
          href="/dashboard"
          className="text-sm font-medium text-primary hover:underline"
        >
          Zum Dashboard
        </Link>
      </Card>
    </div>
  );
}
