import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { LogoWell } from "@/components/ui/LogoWell";
import type { ProviderCardData } from "@/types/provider";

/** Compact provider card (DESIGN.md "Provider cards"): logo + name + game count. */
export function ProviderCard({ provider }: { provider: ProviderCardData }) {
  const { name, logoUrl, gameCount, category, href } = provider;

  return (
    <Link href={href} className="block">
      <Card interactive padding="md" className="flex items-center gap-4">
        <LogoWell name={name} src={logoUrl} className="h-14 w-20" />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-ink">{name}</h3>
          <p className="truncate text-xs text-ink-muted">
            {gameCount} jocuri{category ? ` · ${category}` : ""}
          </p>
        </div>
        <ChevronRight size={18} className="shrink-0 text-ink-muted" />
      </Card>
    </Link>
  );
}
