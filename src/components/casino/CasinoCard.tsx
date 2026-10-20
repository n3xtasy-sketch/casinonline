import { ShieldCheck, Zap, BadgeCheck } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { RatingStars } from "@/components/ui/RatingStars";
import { LogoWell } from "@/components/ui/LogoWell";
import type { CasinoCardData } from "@/types/casino";

/**
 * Horizontal casino card (DESIGN.md "Casino cards"): logo · info · bonus · facts · actions.
 * Reflows to a stacked layout on mobile. Data-driven via the `casino` prop.
 */
export function CasinoCard({ casino }: { casino: CasinoCardData }) {
  const { name, logoUrl, rating, bonus, license, payoutSpeed, verifiedAt, badges, reviewUrl, offerUrl } = casino;

  return (
    <Card interactive padding="lg">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:gap-5">
        {/* Logo + identity */}
        <div className="flex items-center gap-4 lg:w-72 lg:shrink-0">
          <LogoWell name={name} src={logoUrl} className="h-20 w-28" />
          <div className="min-w-0">
            <h3 className="truncate text-base font-bold text-ink">{name}</h3>
            <div className="mt-1">
              {rating > 0 ? (
                <RatingStars value={rating} showValue />
              ) : (
                <span className="text-sm text-ink-muted">Încă neevaluat</span>
              )}
            </div>
            {(license || badges?.length) ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {license ? (
                  <Badge tone="neutral" icon={<ShieldCheck size={12} />}>
                    {license}
                  </Badge>
                ) : null}
                {badges?.map((b) => (
                  <Badge key={b.label} tone={b.tone ?? "neutral"}>
                    {b.label}
                  </Badge>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        {/* Bonus + key facts */}
        <div className="min-w-0 flex-1 lg:border-l lg:border-border lg:pl-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-muted">
            Bonus
          </p>
          {bonus ? (
            <>
              <p className="mt-1 text-lg font-bold text-ink">{bonus.headline}</p>
              {bonus.freeSpins ? (
                <p className="text-sm font-semibold text-accent">
                  + {bonus.freeSpins} rotiri gratuite
                </p>
              ) : null}
            </>
          ) : (
            <p className="mt-1 text-sm text-ink-muted">Fără bonus activ</p>
          )}

          {(payoutSpeed || verifiedAt) ? (
            <div className="mt-3 hidden flex-wrap gap-x-5 gap-y-1 text-xs text-ink-secondary sm:flex">
              {payoutSpeed ? (
                <span className="inline-flex items-center gap-1.5">
                  <Zap size={13} className="text-gold" /> Retragere {payoutSpeed}
                </span>
              ) : null}
              {verifiedAt ? (
                <span className="inline-flex items-center gap-1.5">
                  <BadgeCheck size={13} className="text-accent" /> Verificat {verifiedAt}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2 lg:w-44 lg:shrink-0">
          <Button href={offerUrl} className="w-full">
            Vezi oferta
          </Button>
          <Button variant="secondary" href={reviewUrl} className="w-full">
            Recenzie
          </Button>
        </div>
      </div>
    </Card>
  );
}
