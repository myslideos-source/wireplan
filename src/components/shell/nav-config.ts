export interface RailItem {
  label: string;
  href: string;
  icon: string;
}

export interface RailGroup {
  label: string;
  items: RailItem[];
}

/**
 * §Phase19 — a single navigation list instead of a horizontal TopNav and a
 * vertical Sidebar duplicating "Projekte" between them. Grouped by how the
 * tool is actually used: the core project workflow first, everything else
 * (uploads/analysis/inventory/admin) below it.
 */
export const RAIL_GROUPS: RailGroup[] = [
  {
    label: "Arbeitsbereich",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: "LayoutDashboard" },
      { label: "Projekte", href: "/projects", icon: "FolderKanban" },
      { label: "Editor", href: "/editor", icon: "PencilRuler" },
      { label: "Routing", href: "/routing", icon: "Route" },
      { label: "Exporte", href: "/exports", icon: "FileOutput" },
    ],
  },
  {
    label: "Verwaltung",
    items: [
      { label: "Uploads", href: "/uploads", icon: "UploadCloud" },
      { label: "Analyse", href: "/analysis", icon: "ScanSearch" },
      { label: "Geräte", href: "/devices", icon: "Plug" },
      { label: "Kabel", href: "/cables", icon: "Cable" },
      { label: "Materialien", href: "/materials", icon: "Package" },
      { label: "Abrechnung", href: "/billing", icon: "Receipt" },
      { label: "Einstellungen", href: "/settings", icon: "Settings" },
    ],
  },
];
