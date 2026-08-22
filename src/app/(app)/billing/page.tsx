import { ComingSoon } from "@/components/shell/ComingSoon";

export default function BillingPage() {
  return (
    <ComingSoon
      title="Abrechnung"
      description="Der Home-Tarif (24,99 €/Monat, monatlich kündbar über Stripe) wird angebunden, sobald Supabase Auth und Stripe-Webhooks live sind."
    />
  );
}
