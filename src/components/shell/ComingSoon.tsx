import Link from "next/link";
import { Construction } from "lucide-react";
import { Card, Badge, Button } from "@/components/ui";
import type { FeatureFlag } from "@/lib/feature-flags";
import { PHASE_BY_FLAG } from "@/lib/feature-flags";

export function ComingSoon({
  title,
  description,
  flag,
  cta,
}: {
  title: string;
  description: string;
  flag?: FeatureFlag;
  cta?: { label: string; href: string };
}) {
  return (
    <div className="flex h-full items-center justify-center p-8">
      <Card className="flex max-w-md flex-col items-center gap-4 px-8 py-10 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary/10 text-secondary">
          <Construction className="h-6 w-6" />
        </span>
        <div>
          <h2 className="text-base font-semibold text-text">{title}</h2>
          <p className="mt-2 text-sm text-text-secondary">{description}</p>
        </div>
        {flag && (
          <Badge tone="neutral">
            Demnächst — Phase {PHASE_BY_FLAG[flag]} · {flag}
          </Badge>
        )}
        {cta && (
          <Link href={cta.href}>
            <Button variant="secondary" size="sm">
              {cta.label}
            </Button>
          </Link>
        )}
      </Card>
    </div>
  );
}
