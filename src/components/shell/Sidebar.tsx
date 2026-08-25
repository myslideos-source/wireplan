"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderKanban,
  UploadCloud,
  ScanSearch,
  Plug,
  Cable,
  FileOutput,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SIDEBAR_ITEMS } from "./nav-config";

const ICONS: Record<string, LucideIcon> = {
  LayoutDashboard,
  FolderKanban,
  UploadCloud,
  ScanSearch,
  Plug,
  Cable,
  FileOutput,
  Settings,
};

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-60 shrink-0 flex-col gap-0.5 border-r border-shell-border bg-shell-bg p-3">
      {SIDEBAR_ITEMS.map((item) => {
        const Icon = ICONS[item.icon];
        const isActive = pathname?.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-[var(--radius-sm)] px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-shell-accent/15 text-shell-accent"
                : "text-shell-text-muted hover:bg-shell-bg-elevated hover:text-shell-text",
            )}
          >
            <Icon className="h-4 w-4 shrink-0" strokeWidth={2} />
            {item.label}
          </Link>
        );
      })}
    </aside>
  );
}
