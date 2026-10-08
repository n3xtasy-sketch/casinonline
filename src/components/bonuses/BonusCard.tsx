import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { BonusCardData } from "@/types/bonus";

/**
 * Bonus card (DESIGN.md "Bonus cards"): dark card with a subtle green accent wash.
 * Shows bonus type, casino, offer, wagering and a single CTA.
 */
export function BonusCard({ bonus }: { bonus: BonusCardData }) {
  const { bonusType, casinoName, offer, freeSpins, wagering, code, claimUrl } = bonus;

  return (
    <Card interactive padding="lg" className="relative h-full overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(135deg, rgba(34,197,94,0.12), rgba(34,197,94,0.03))",
        }}
      />

      <div className="relative flex h-full flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <Badge tone="accent">{bonusType}</Badge>
          <span className="min-w-0 truncate text-sm font-semibold text-ink-secondary">
            {casinoName}
          </span>
        </div>

        <div>
          <p className="text-xl font-bold text-ink">{offer}</p>
          {freeSpins ? (
            <p className="mt-0.5 text-sm font-semibold text-accent">
              + {freeSpins} rotiri gratuite
            </p>
          ) : null}
        </div>

        {wagering || code ? (
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-secondary">
            {wagering ? (
              <span>
                Rulaj: <b className="font-semibold text-ink">{wagering}</b>
              </span>
            ) : null}
            {code ? (
              <span>
                Cod: <b className="font-semibold text-ink">{code}</b>
              </span>
            ) : null}
          </div>
        ) : null}

        <div className="mt-auto pt-1">
          <Button href={claimUrl} className="w-full">
            Vezi oferta
          </Button>
        </div>
      </div>
    </Card>
  );
}
