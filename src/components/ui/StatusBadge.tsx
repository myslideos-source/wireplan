import type { GeometryStatus } from "@/domain";
import { Badge } from "./Badge";

const GEOMETRY_STATUS_META: Record<
  GeometryStatus,
  { label: string; tone: "neutral" | "primary" | "success" | "warning" }
> = {
  DRAFT: { label: "Entwurf", tone: "neutral" },
  IN_REVIEW: { label: "In Prüfung", tone: "warning" },
  VALIDATED: { label: "Validiert", tone: "primary" },
  CONFIRMED: { label: "Bestätigt", tone: "success" },
  LOCKED: { label: "Gesperrt", tone: "success" },
};

export function GeometryStatusBadge({ status }: { status: GeometryStatus }) {
  const meta = GEOMETRY_STATUS_META[status];
  return (
    <Badge tone={meta.tone} dot>
      {meta.label}
    </Badge>
  );
}
