import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { BonusDetail } from "@/types/bonus";

/** Hero block for the bonus detail page: type, casino, offer, promo code, claim CTA. */
export function BonusDetailHeader({ bonus }: { bonus: BonusDetail }) {
  const { bonusType, casinoName, offer, freeSpins, code, claimUrl } = bonus;

  return (
    <Card padding="lg" className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(135deg, rgba(34,197,94,0.12), rgba(34,197,94,0.03))",
        }}
      />

      <div className="relative">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Badge tone="accent">{bonusType}</Badge>
          <span className="text-sm font-semibold text-ink-secondary">{casinoName}</span>
        </div>

        <h1 className="mt-3 text-2xl font-bold text-ink md:text-3xl">{offer}</h1>
        {freeSpins ? (
          <p className="mt-1 text-sm font-semibold text-accent">+ {freeSpins} rotiri gratuite</p>
        ) : null}

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Button href={claimUrl}>Revendică bonusul</Button>
          {code ? (
            <span className="inline-flex items-center gap-2 rounded-sm border border-border-strong bg-elevated px-3 py-2 text-sm text-ink-secondary">
              Cod: <b className="font-semibold text-ink">{code}</b>
            </span>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
