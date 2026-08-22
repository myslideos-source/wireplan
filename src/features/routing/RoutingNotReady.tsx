import Link from "next/link";
import { Cable } from "lucide-react";
import { Card, Button } from "@/components/ui";
import type { Project } from "@/domain";

export function RoutingNotReady({ project }: { project: Project }) {
  return (
    <div className="flex h-full items-center justify-center p-8">
      <Card className="flex max-w-md flex-col items-center gap-4 px-8 py-10 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary/10 text-secondary">
          <Cable className="h-6 w-6" />
        </span>
        <div>
          <h2 className="text-base font-semibold text-text">
            Öffnen Sie zuerst den Editor für {project.name}
          </h2>
          <p className="mt-2 text-sm text-text-secondary">
            Das Kabelrouting baut auf dem Grundriss, den Elektrogeräten und
            dem Schaltschrank aus dem Editor auf. Öffnen Sie das Projekt dort
            zuerst.
          </p>
        </div>
        <Link href={`/editor?project=${project.id}`}>
          <Button>Editor öffnen</Button>
        </Link>
      </Card>
    </div>
  );
}
