import { cn } from "@/lib/cn";
import { WidgetCard } from "@/components/ui/WidgetCard";
import { RankedList } from "@/components/widgets/RankedList";
import { topCasinos, popularGames } from "@/data/mock";

/** Contextual discovery sidebar — desktop only (>= xl). */
export function RightSidebar({ className }: { className?: string }) {
  return (
    <aside className={cn("min-w-0", className)}>
      <div className="sticky top-[88px] flex flex-col gap-4">
        <WidgetCard title="Top cazinouri">
          <RankedList rows={topCasinos} />
        </WidgetCard>

        <WidgetCard title="Jocuri populare">
          <RankedList rows={popularGames} />
        </WidgetCard>

        <WidgetCard title="Bonusul zilei">
          <p className="text-sm text-ink-secondary">
            Spațiu rezervat — se completează în Phase 2.
          </p>
        </WidgetCard>
      </div>
    </aside>
  );
}
