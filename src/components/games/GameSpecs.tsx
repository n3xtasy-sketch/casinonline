import { Percent, Activity, Trophy, Calendar, Grid3x3, AlignJustify, Coins } from "lucide-react";
import { FactsGrid, type Fact } from "@/components/ui/FactsGrid";
import type { GameDetail } from "@/types/game";

/** Technical specs grid for the game detail page. */
export function GameSpecs({ game }: { game: GameDetail }) {
  const facts: Fact[] = [
    { icon: Percent, label: "RTP", value: game.rtp ? `${game.rtp}%` : undefined },
    { icon: Activity, label: "Volatilitate", value: game.volatility },
    { icon: Trophy, label: "Câștig maxim", value: game.maxWin },
    { icon: Calendar, label: "Lansare", value: game.releaseDate },
    { icon: Grid3x3, label: "Role", value: game.reels },
    { icon: AlignJustify, label: "Linii / Mod", value: game.paylines },
    { icon: Coins, label: "Interval pariu", value: game.betRange },
  ];
  return <FactsGrid facts={facts} />;
}
