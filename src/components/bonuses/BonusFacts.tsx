import { Gift, Coins, Sparkles, Repeat, Banknote, Calendar, Ticket } from "lucide-react";
import { FactsGrid, type Fact } from "@/components/ui/FactsGrid";
import type { BonusDetail } from "@/types/bonus";

/** Key-facts grid for the bonus detail page. */
export function BonusFacts({ bonus }: { bonus: BonusDetail }) {
  const facts: Fact[] = [
    { icon: Gift, label: "Tip bonus", value: bonus.bonusType },
    { icon: Coins, label: "Valoare", value: bonus.offer },
    { icon: Sparkles, label: "Rotiri gratuite", value: bonus.freeSpins ? `${bonus.freeSpins}` : undefined },
    { icon: Repeat, label: "Rulaj", value: bonus.wagering },
    { icon: Banknote, label: "Depunere minimă", value: bonus.minDeposit },
    { icon: Calendar, label: "Valabilitate", value: bonus.validity },
    { icon: Ticket, label: "Cod promo", value: bonus.code },
  ];
  return <FactsGrid facts={facts} />;
}
