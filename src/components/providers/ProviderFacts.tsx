import { Gamepad2, LayoutGrid, Calendar, MapPin, Sparkles, Percent } from "lucide-react";
import { FactsGrid, type Fact } from "@/components/ui/FactsGrid";
import type { ProviderDetail } from "@/types/provider";

/** Key-facts grid for the provider detail page. */
export function ProviderFacts({ provider }: { provider: ProviderDetail }) {
  const facts: Fact[] = [
    { icon: Gamepad2, label: "Număr de jocuri", value: `${provider.gameCount}+` },
    { icon: LayoutGrid, label: "Categorie", value: provider.category },
    { icon: Calendar, label: "Fondat", value: provider.founded },
    { icon: MapPin, label: "Sediu", value: provider.country },
    { icon: Sparkles, label: "Specialitate", value: provider.specialty },
    { icon: Percent, label: "RTP mediu", value: provider.rtpRange },
  ];
  return <FactsGrid facts={facts} />;
}
