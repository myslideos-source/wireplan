import { FlaskConical } from "lucide-react";

export function DemoDataBanner({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 rounded-[var(--radius-md)] border border-secondary/30 bg-secondary/10 px-4 py-3 text-sm text-text-secondary">
      <FlaskConical className="mt-0.5 h-4 w-4 shrink-0 text-secondary" />
      <p>{children}</p>
    </div>
  );
}
