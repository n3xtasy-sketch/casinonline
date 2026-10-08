import { Wallet, Zap, Clock, Receipt, Coins, Banknote } from "lucide-react";
import { FactsGrid, type Fact } from "@/components/ui/FactsGrid";
import type { PaymentMethodDetail } from "@/types/payment";

/** Key-facts grid for the payment method detail page. */
export function PaymentFacts({ method }: { method: PaymentMethodDetail }) {
  const facts: Fact[] = [
    { icon: Wallet, label: "Tip", value: method.type },
    { icon: Zap, label: "Viteză depunere", value: method.depositSpeed },
    { icon: Clock, label: "Viteză retragere", value: method.withdrawalSpeed },
    { icon: Receipt, label: "Comisioane", value: method.fees },
    { icon: Coins, label: "Limită minimă", value: method.minLimit },
    { icon: Banknote, label: "Limită maximă", value: method.maxLimit },
  ];
  return <FactsGrid facts={facts} />;
}
