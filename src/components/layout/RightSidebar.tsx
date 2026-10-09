import { Suspense } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { WidgetCard } from "@/components/ui/WidgetCard";
import { RankedList } from "@/components/widgets/RankedList";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  getTopCasinosRanked,
  getPopularGamesRanked,
  getBonusOfTheDay,
  getHomeGuides,
} from "@/lib/db/home";

/** Contextual discovery sidebar — desktop only (>= xl). */
export function RightSidebar({ className }: { className?: string }) {
  return (
    <aside className={cn("min-w-0", className)}>
      <div className="sticky top-[88px] flex flex-col gap-4">
        <Suspense fallback={<SidebarFallback />}>
          <SidebarWidgets />
        </Suspense>
      </div>
    </aside>
  );
}

/** Server component: fetches the widget data (queries live in lib/db/home). */
async function SidebarWidgets() {
  const [topCasinos, popularGames, bonus, guides] = await Promise.all([
    getTopCasinosRanked(),
    getPopularGamesRanked(),
    getBonusOfTheDay(),
    getHomeGuides(),
  ]);

  return (
    <>
      <WidgetCard title="Top cazinouri">
        <RankedList rows={topCasinos} />
      </WidgetCard>

      <WidgetCard title="Jocuri populare">
        <RankedList rows={popularGames} />
      </WidgetCard>

      <WidgetCard title="Bonusul zilei">
        {bonus ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <Badge tone="accent">{bonus.bonusType}</Badge>
              <span className="min-w-0 truncate text-sm font-semibold text-ink-secondary">
                {bonus.casinoName}
              </span>
            </div>
            <p className="text-base font-bold text-ink">{bonus.offer}</p>
            {bonus.freeSpins ? (
              <p className="text-sm font-semibold text-accent">
                + {bonus.freeSpins} rotiri gratuite
              </p>
            ) : null}
            {bonus.wagering || bonus.code ? (
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-secondary">
                {bonus.wagering ? (
                  <span>
                    Rulaj: <b className="font-semibold text-ink">{bonus.wagering}</b>
                  </span>
                ) : null}
                {bonus.code ? (
                  <span>
                    Cod: <b className="font-semibold text-ink">{bonus.code}</b>
                  </span>
                ) : null}
              </div>
            ) : null}
            <Button href={bonus.claimUrl} className="mt-1 w-full">
              Vezi oferta
            </Button>
          </div>
        ) : (
          <p className="text-sm text-ink-secondary">Niciun bonus disponibil momentan.</p>
        )}
      </WidgetCard>

      <WidgetCard title="Ghiduri recente">
        <ol className="flex flex-col">
          {guides.map((guide) => (
            <li
              key={guide.slug}
              className="border-b border-border/60 last:border-0"
            >
              <Link
                href={guide.href}
                className="flex items-center gap-2 py-2.5 text-sm font-medium text-ink transition-colors hover:text-accent"
              >
                <span aria-hidden className="text-ink-muted">
                  ›
                </span>
                <span className="min-w-0 flex-1 truncate">{guide.title}</span>
              </Link>
            </li>
          ))}
        </ol>
      </WidgetCard>
    </>
  );
}

/** Streaming placeholder — mirrors the four widget cards to avoid layout shift. */
function SidebarFallback() {
  const cards: Array<[string, number]> = [
    ["Top cazinouri", 5],
    ["Jocuri populare", 5],
    ["Bonusul zilei", 3],
    ["Ghiduri recente", 3],
  ];
  return (
    <>
      {cards.map(([title, rows]) => (
        <WidgetCard key={title} title={title}>
          <div className="flex flex-col gap-2.5">
            {Array.from({ length: rows }).map((_, i) => (
              <div key={i} className="h-4 animate-pulse rounded bg-border/60" />
            ))}
          </div>
        </WidgetCard>
      ))}
    </>
  );
}
