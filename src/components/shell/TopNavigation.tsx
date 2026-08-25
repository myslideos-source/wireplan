"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Zap, Settings, Bell, ChevronDown, User, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dropdown,
  DropdownItem,
  DropdownLabel,
  DropdownSeparator,
} from "@/components/ui";
import { TOP_NAV_ITEMS, MORE_NAV_ITEMS } from "./nav-config";

/**
 * §2-3 (mockup) — one thin (≈64px) horizontal nav bar replaces the dark
 * vertical Rail. Active tab gets a plain green underline, not a pill or a
 * filled background — the reference is explicit that this should stay
 * understated ("Keine großen Pills. Keine riesigen Buttons.").
 *
 * `extra` lets a page inject page-scoped controls (Undo/Redo/Zoom on the
 * Editor page) into the right-hand cluster, ahead of the always-present
 * Settings/Notifications/Profile — those three are the only truly global
 * controls, everything else is contextual to whichever page is open.
 */
export function TopNavigation({ extra }: { extra?: ReactNode }) {
  const pathname = usePathname();

  return (
    <header className="flex h-16 shrink-0 items-center gap-6 border-b border-border bg-panel px-5">
      <Link href="/dashboard" className="flex items-center gap-2.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-primary/10 text-primary">
          <Zap className="h-4 w-4" fill="currentColor" />
        </span>
        <span className="flex flex-col leading-none">
          <span className="text-sm font-bold tracking-tight text-text">
            ELEKTRO PLANER
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-wide text-primary">
            Loxone Smart Home
          </span>
        </span>
      </Link>

      <nav className="flex h-full items-stretch gap-1">
        {TOP_NAV_ITEMS.map((item) => {
          const isActive = pathname?.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex items-center px-3 text-sm font-medium transition-colors",
                isActive
                  ? "text-text"
                  : "text-text-secondary hover:text-text",
              )}
            >
              {item.label}
              {isActive && (
                <span className="absolute inset-x-3 bottom-0 h-[2px] rounded-full bg-primary" />
              )}
            </Link>
          );
        })}

        <Dropdown
          align="start"
          trigger={
            <span className="flex h-full items-center gap-1 px-3 text-sm font-medium text-text-secondary transition-colors hover:text-text">
              <MoreHorizontal className="h-4 w-4" />
            </span>
          }
        >
          <DropdownLabel>Mehr</DropdownLabel>
          {MORE_NAV_ITEMS.map((item) => (
            <Link key={item.href} href={item.href}>
              <DropdownItem>{item.label}</DropdownItem>
            </Link>
          ))}
        </Dropdown>
      </nav>

      <div className="ml-auto flex items-center gap-1">
        {extra}

        <button
          type="button"
          aria-label="Einstellungen"
          className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-sm)] text-text-secondary transition-colors hover:bg-panel-elevated hover:text-text"
        >
          <Settings className="h-4 w-4" />
        </button>

        <button
          type="button"
          aria-label="Benachrichtigungen"
          className="relative flex h-9 w-9 items-center justify-center rounded-[var(--radius-sm)] text-text-secondary transition-colors hover:bg-panel-elevated hover:text-text"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute right-1.5 top-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-white">
            3
          </span>
        </button>

        <Dropdown
          align="end"
          trigger={
            <span className="flex items-center gap-2 rounded-[var(--radius-sm)] py-1.5 pl-1.5 pr-2 transition-colors hover:bg-panel-elevated">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary">
                <User className="h-3.5 w-3.5" />
              </span>
              <ChevronDown className="h-3.5 w-3.5 text-text-muted" />
            </span>
          }
        >
          <DropdownLabel>Max Mustermann</DropdownLabel>
          <DropdownItem>Konto & Profil</DropdownItem>
          <DropdownItem>Team einladen</DropdownItem>
          <DropdownSeparator />
          <DropdownItem className="text-error hover:text-error">
            Abmelden
          </DropdownItem>
        </Dropdown>
      </div>
    </header>
  );
}
