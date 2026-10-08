import Image from "next/image";
import { Gamepad2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { FavoriteButton } from "@/components/ui/FavoriteButton";
import type { GameCardData } from "@/types/game";

/**
 * Vertical game card (DESIGN.md "Game cards"): 4:3 thumbnail + name/provider.
 * Hover (or keyboard focus) reveals RTP / volatility / "Vezi jocul".
 */
export function GameCard({ game }: { game: GameCardData }) {
  const { name, provider, thumbnailUrl, rtp, volatility, href } = game;

  return (
    <Card padding="none" interactive className="group overflow-hidden">
      <div className="relative aspect-[4/3] bg-gradient-to-br from-elevated to-surface">
        {thumbnailUrl ? (
          <Image
            src={thumbnailUrl}
            alt={name}
            fill
            sizes="(max-width: 768px) 50vw, 220px"
            className="object-cover"
          />
        ) : (
          <div className="grid h-full place-items-center text-ink-disabled">
            <Gamepad2 size={40} strokeWidth={1.5} />
          </div>
        )}

        {/* Default-state subtle bottom gradient */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/55 to-transparent" />

        <FavoriteButton label={name} className="absolute right-2 top-2 z-10" />

        {/* Hover / focus reveal */}
        <div className="absolute inset-0 flex flex-col justify-end gap-2 bg-black/70 p-3 opacity-0 transition-opacity duration-[180ms] ease-out group-hover:opacity-100 focus-within:opacity-100">
          {rtp || volatility ? (
            <div className="flex flex-wrap gap-1.5">
              {rtp ? <Badge tone="neutral">RTP {rtp}%</Badge> : null}
              {volatility ? <Badge tone="neutral">Volatilitate {volatility}</Badge> : null}
            </div>
          ) : null}
          <Button href={href} className="w-full">
            Vezi jocul
          </Button>
        </div>
      </div>

      <div className="p-3">
        <h3 className="truncate text-sm font-semibold text-ink">{name}</h3>
        <p className="truncate text-xs text-ink-muted">{provider}</p>
      </div>
    </Card>
  );
}
