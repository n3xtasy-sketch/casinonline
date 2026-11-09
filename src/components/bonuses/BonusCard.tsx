import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { shouldShowDetailsLink } from "@/components/bonuses/bonus-card-cta";
import type { BonusCardData } from "@/types/bonus";

/**
 * Bonus card (DESIGN.md "Bonus cards"): dark card with a subtle green accent wash. The offer title
 * and the secondary "Detalii bonus" link go to the resolved SEO destination (seoHref); the primary
 * "Revendică bonusul" CTA goes to the affiliate claimUrl (URL-2.4). When the card is already on its
 * own SEO destination (self-link), the "Detalii bonus" link is hidden but the affiliate CTA stays.
 * `currentPath` is supplied only where a self-link is possible (category pages).
 */
export function BonusCard({ bonus, currentPath }: { bonus: BonusCardData; currentPath?: string }) {
  const { bonusType, casinoName, offer, freeSpins, wagering, code, seoHref, claimUrl } = bonus;
  const showDetails = shouldShowDetailsLink(seoHref, currentPath);

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
          {showDetails ? (
            <Link href={seoHref} className="text-xl font-bold text-ink hover:text-accent">
              {offer}
            </Link>
          ) : (
            <span className="text-xl font-bold text-ink">{offer}</span>
          )}
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

        <div className="mt-auto flex flex-col gap-2 pt-1">
          <Button href={claimUrl} className="w-full">
            Revendică bonusul
          </Button>
          {showDetails ? (
            <Button variant="secondary" href={seoHref} className="w-full">
              Detalii bonus
            </Button>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
