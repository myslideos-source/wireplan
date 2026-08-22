export interface TopNavItem {
  label: string;
  href: string;
}

export const TOP_NAV_ITEMS: TopNavItem[] = [
  { label: "Projekte", href: "/projects" },
  { label: "Editor", href: "/editor" },
  { label: "Routing", href: "/routing" },
  { label: "Materialien", href: "/materials" },
  { label: "Abrechnung", href: "/billing" },
];

export interface SidebarItem {
  label: string;
  href: string;
  icon: string;
}

export const SIDEBAR_ITEMS: SidebarItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: "LayoutDashboard" },
  { label: "Projekte", href: "/projects", icon: "FolderKanban" },
  { label: "Uploads", href: "/uploads", icon: "UploadCloud" },
  { label: "Analyse", href: "/analysis", icon: "ScanSearch" },
  { label: "Geräte", href: "/devices", icon: "Plug" },
  { label: "Kabel", href: "/cables", icon: "Cable" },
  { label: "Exporte", href: "/exports", icon: "FileOutput" },
  { label: "Einstellungen", href: "/settings", icon: "Settings" },
];
