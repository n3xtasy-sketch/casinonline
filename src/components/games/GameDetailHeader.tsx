import Image from "next/image";
import { Gamepad2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { gameCategoryFilters } from "@/data/games";
import type { GameDetail } from "@/types/game";

/** Hero block for the game detail page: thumbnail, name, provider, key badges, play CTA. */
export function GameDetailHeader({ game, playUrl }: { game: GameDetail; playUrl?: string }) {
  const { name, provider, thumbnailUrl, rtp, volatility, categorySlug } = game;
  const categoryLabel =
    gameCategoryFilters.find((c) => c.value === categorySlug)?.label ?? categorySlug;

  return (
    <Card padding="lg">
      <div className="flex flex-col gap-5 md:flex-row">
        <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden rounded-md bg-gradient-to-br from-elevated to-surface md:w-64">
          {thumbnailUrl ? (
            <Image src={thumbnailUrl} alt={name} fill sizes="256px" className="object-cover" />
          ) : (
            <div className="grid h-full place-items-center text-ink-disabled">
              <Gamepad2 size={44} strokeWidth={1.5} />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold text-ink md:text-3xl">{name}</h1>
          <p className="mt-1 text-sm text-ink-muted">de {provider}</p>

          <div className="mt-3 flex flex-wrap gap-1.5">
            <Badge tone="neutral">{categoryLabel}</Badge>
            {volatility ? <Badge tone="neutral">Volatilitate {volatility}</Badge> : null}
            {rtp ? <Badge tone="accent">RTP {rtp}%</Badge> : null}
          </div>

          {playUrl ? (
            <div className="mt-5">
              <Button href={playUrl}>Joacă acum</Button>
            </div>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
