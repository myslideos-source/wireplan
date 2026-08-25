"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Zap,
  LayoutDashboard,
  FolderKanban,
  PencilRuler,
  Route,
  FileOutput,
  UploadCloud,
  ScanSearch,
  Plug,
  Cable,
  Package,
  Receipt,
  Settings,
  Bell,
  ChevronDown,
  Sun,
  Moon,
  User,
  CheckCircle2,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dropdown,
  DropdownItem,
  DropdownLabel,
  DropdownSeparator,
} from "@/components/ui";
import { RAIL_GROUPS } from "./nav-config";

const ICONS: Record<string, LucideIcon> = {
  LayoutDashboard,
  FolderKanban,
  PencilRuler,
  Route,
  FileOutput,
  UploadCloud,
  ScanSearch,
  Plug,
  Cable,
  Package,
  Receipt,
  Settings,
};

/**
 * §Phase19 — one navigation surface instead of a horizontal TopNav plus a
 * vertical Sidebar that duplicated "Projekte" between them. Doubles as the
 * editor's own global nav (the editor route group used to stack its own
 * top bar underneath a second, separate TopNav — now there's exactly one
 * piece of "app chrome" wrapping every page, and the editor's own project/
 * floor bar underneath it is clearly its own, page-level tool instead of a
 * second global nav). System status (autosave/errors) and the account/
 * theme controls that used to live in a separate top bar and a separate
 * bottom status bar now live in this rail's footer instead.
 */
export function Rail() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-shell-border bg-shell-bg">
      <Link
        href="/dashboard"
        className="flex items-center gap-2.5 border-b border-shell-border px-4 py-4"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-shell-accent/15 text-shell-accent">
          <Zap className="h-4 w-4" fill="currentColor" />
        </span>
        <span className="flex flex-col leading-none">
          <span className="text-base font-bold tracking-tight text-shell-text">
            WIRE<span className="text-shell-accent">PLAN</span>
          </span>
          <span className="text-[10px] font-medium text-shell-text-muted">
            Loxone Elektroplaner
          </span>
        </span>
      </Link>

      <nav className="flex flex-1 flex-col gap-5 overflow-y-auto p-3 scrollbar-thin-shell">
        {RAIL_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="px-2 pb-1.5 text-[11px] font-semibold uppercase tracking-wide text-shell-text-muted">
              {group.label}
            </p>
            <div className="flex flex-col gap-0.5">
              {group.items.map((item) => {
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
            </div>
          </div>
        ))}
      </nav>

      <div className="flex flex-col gap-2 border-t border-shell-border p-3">
        <div className="flex items-center gap-1.5 px-1 text-xs text-shell-text-muted">
          <CheckCircle2 className="h-3.5 w-3.5 text-shell-accent" />
          Keine Fehler · Gespeichert
        </div>

        <div className="flex items-center gap-1">
          <Dropdown
            align="start"
            side="top"
            trigger={
              <span className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] text-shell-text-muted transition-colors hover:bg-shell-bg-elevated hover:text-shell-text">
                <Sun className="h-4 w-4" />
              </span>
            }
          >
            <DropdownLabel>Theme</DropdownLabel>
            <DropdownItem className="text-text">
              <Sun className="h-4 w-4 text-primary" />
              Light (aktiv)
            </DropdownItem>
            <DropdownItem disabled title="Demnächst verfügbar">
              <Moon className="h-4 w-4" />
              Dark — Demnächst
            </DropdownItem>
          </Dropdown>

          <button
            type="button"
            className="relative flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] text-shell-text-muted transition-colors hover:bg-shell-bg-elevated hover:text-shell-text"
            aria-label="Benachrichtigungen"
          >
            <Bell className="h-4 w-4" />
            <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-shell-accent" />
          </button>
        </div>

        <Dropdown
          align="start"
          side="top"
          triggerClassName="w-full"
          trigger={
            <div className="flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-1.5 py-1.5 transition-colors hover:bg-shell-bg-elevated">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-shell-accent/15 text-xs font-semibold text-shell-accent">
                <User className="h-3.5 w-3.5" />
              </span>
              <span className="min-w-0 flex-1 truncate text-left text-xs font-medium text-shell-text">
                Musotto Labs
              </span>
              <ChevronDown className="h-3.5 w-3.5 shrink-0 text-shell-text-muted" />
            </div>
          }
        >
          <DropdownLabel>Workspace</DropdownLabel>
          <DropdownItem>Musotto Labs — Home</DropdownItem>
          <DropdownSeparator />
          <DropdownItem>Konto & Profil</DropdownItem>
          <DropdownItem>Team einladen</DropdownItem>
          <DropdownSeparator />
          <DropdownItem className="text-error hover:text-error">
            Abmelden
          </DropdownItem>
        </Dropdown>
      </div>
    </aside>
  );
}
