export interface NavItem {
  label: string;
  href: string;
  icon: string;
}

/**
 * §20 (mockup) — a thin horizontal top nav with a handful of primary tabs,
 * not a long vertical list. Every route that used to live in the Rail's
 * "Verwaltung" group is still reachable — just moved into the "Mehr" menu
 * (see MORE_NAV_ITEMS) instead of the main tab row, so nothing the app
 * could do before becomes unreachable (§41) while the primary row stays
 * as uncluttered as the reference mockup.
 *
 * "Schaltschrank" isn't a tab here yet — it points at the same content as
 * "Auswertungen" today (the Loxone tab on /routing already lists cabinet
 * components). It becomes its own tab once Phase 25 builds the dedicated
 * DIN-rail cabinet view, rather than pointing two tabs at one page now.
 */
export const TOP_NAV_ITEMS: NavItem[] = [
  { label: "Projekt", href: "/dashboard", icon: "LayoutDashboard" },
  { label: "Planung", href: "/editor", icon: "PencilRuler" },
  { label: "Auswertungen", href: "/routing", icon: "Route" },
  { label: "Material", href: "/materials", icon: "Package" },
  { label: "Projektinfo", href: "/settings", icon: "Settings" },
];

export const MORE_NAV_ITEMS: NavItem[] = [
  { label: "Alle Projekte", href: "/projects", icon: "FolderKanban" },
  { label: "Uploads", href: "/uploads", icon: "UploadCloud" },
  { label: "KI-Analyse", href: "/analysis", icon: "ScanSearch" },
  { label: "Geräte", href: "/devices", icon: "Plug" },
  { label: "Kabel", href: "/cables", icon: "Cable" },
  { label: "Exporte", href: "/exports", icon: "FileOutput" },
  { label: "Abrechnung", href: "/billing", icon: "Receipt" },
];
