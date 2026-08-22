import { ComingSoon } from "@/components/shell/ComingSoon";

export default function MaterialsPage() {
  return (
    <ComingSoon
      title="Materialliste"
      description="Eine Kabel-Materialliste (Typen und Gesamtlängen) ist bereits im Kabelrouting verfügbar. Die volle Stückliste inklusive Loxone-Hardware folgt in Phase 9."
      flag="MATERIAL_CALCULATION"
      cta={{ label: "Zum Kabelrouting", href: "/routing" }}
    />
  );
}
