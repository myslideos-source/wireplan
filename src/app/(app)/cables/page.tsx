import { ComingSoon } from "@/components/shell/ComingSoon";

export default function CablesPage() {
  return (
    <ComingSoon
      title="Kabel"
      description="Die Kabelliste mit Typ, Länge und Verlegeart wird pro Projekt im Kabelrouting berechnet."
      cta={{ label: "Zum Kabelrouting", href: "/routing" }}
    />
  );
}
