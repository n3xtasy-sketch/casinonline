import { ShieldCheck, Banknote, Clock, IdCard, Smartphone, Headphones } from "lucide-react";
import { FactsGrid, type Fact } from "@/components/ui/FactsGrid";
import type { CasinoDetail } from "@/types/casino";

/** Key-facts grid for the casino review page. */
export function CasinoFacts({ casino }: { casino: CasinoDetail }) {
  const facts: Fact[] = [
    { icon: ShieldCheck, label: "Licență", value: casino.license },
    { icon: Banknote, label: "Depunere minimă", value: casino.minDeposit },
    { icon: Clock, label: "Timp retragere", value: casino.withdrawalTime ?? casino.payoutSpeed },
    { icon: IdCard, label: "Verificare (KYC)", value: casino.kyc },
    { icon: Smartphone, label: "Mobil", value: casino.mobile },
    { icon: Headphones, label: "Suport", value: casino.support },
  ];
  return <FactsGrid facts={facts} />;
}
