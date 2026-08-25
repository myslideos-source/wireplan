"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, ChevronDown, Sun, Moon, User, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dropdown,
  DropdownItem,
  DropdownLabel,
  DropdownSeparator,
} from "@/components/ui";
import { TOP_NAV_ITEMS } from "./nav-config";

export function TopNav() {
  const pathname = usePathname();

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-shell-border bg-shell-bg px-6">
      <div className="flex items-center gap-10">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] bg-shell-accent/15 text-shell-accent">
            <Zap className="h-4 w-4" fill="currentColor" />
          </span>
          <span className="flex flex-col leading-none">
            <span className="text-lg font-bold tracking-tight text-shell-text">
              WIRE<span className="text-shell-accent">PLAN</span>
            </span>
            <span className="text-[10px] font-medium text-shell-text-muted">
              Loxone Elektroplaner
            </span>
          </span>
        </Link>

        <nav className="flex h-16 items-stretch gap-1">
          {TOP_NAV_ITEMS.map((item) => {
            const isActive = pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative flex items-center px-3 text-sm font-medium transition-colors",
                  isActive
                    ? "text-shell-accent"
                    : "text-shell-text-muted hover:text-shell-text",
                )}
              >
                {item.label}
                {isActive && (
                  <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-shell-accent shadow-[0_0_8px_rgba(74,222,128,0.6)]" />
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="flex items-center gap-2">
        <Dropdown
          trigger={
            <span className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-sm)] text-shell-text-muted transition-colors hover:bg-shell-bg-elevated hover:text-shell-text">
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
          className="relative flex h-9 w-9 items-center justify-center rounded-[var(--radius-sm)] text-shell-text-muted transition-colors hover:bg-shell-bg-elevated hover:text-shell-text"
          aria-label="Benachrichtigungen"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-shell-accent" />
        </button>

        <Dropdown
          trigger={
            <>
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-shell-accent/15 text-xs font-semibold text-shell-accent">
                <User className="h-4 w-4" />
              </span>
              <ChevronDown className="h-3.5 w-3.5 text-shell-text-muted" />
            </>
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
    </header>
  );
}
