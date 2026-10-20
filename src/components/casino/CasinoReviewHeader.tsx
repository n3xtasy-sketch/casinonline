import { ShieldCheck, Zap, BadgeCheck } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { RatingStars } from "@/components/ui/RatingStars";
import { LogoWell } from "@/components/ui/LogoWell";
import type { CasinoDetail } from "@/types/casino";

/** Hero block for the casino review page: identity, rating, badges, bonus, CTA. */
export function CasinoReviewHeader({ casino }: { casino: CasinoDetail }) {
  const { name, logoUrl, rating, bonus, license, payoutSpeed, verifiedAt, badges, offerUrl } = casino;

  return (
    <Card padding="lg">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center">
        <LogoWell name={name} src={logoUrl} className="h-24 w-32" />

        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold text-ink md:text-3xl">{name}</h1>
          <div className="mt-2">
            {rating > 0 ? (
              <RatingStars value={rating} showValue size={17} />
            ) : (
              <span className="text-sm text-ink-muted">Încă neevaluat</span>
            )}
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
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
          {payoutSpeed || verifiedAt ? (
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-ink-secondary">
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

        <div className="flex flex-col gap-2 lg:w-52 lg:shrink-0">
          {bonus ? (
            <div className="rounded-sm border border-border bg-elevated p-3 text-center">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-muted">
                Bonus
              </p>
              <p className="mt-0.5 text-base font-bold text-ink">{bonus.headline}</p>
              {bonus.freeSpins ? (
                <p className="text-sm font-semibold text-accent">+ {bonus.freeSpins} rotiri</p>
              ) : null}
            </div>
          ) : null}
          <Button href={offerUrl} className="w-full">
            Vezi oferta
          </Button>
        </div>
      </div>
    </Card>
  );
}
