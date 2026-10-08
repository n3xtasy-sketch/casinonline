import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { LogoWell } from "@/components/ui/LogoWell";
import type { ProviderDetail } from "@/types/provider";

/** Hero block for the provider detail page: logo, name, game count, category. */
export function ProviderDetailHeader({ provider }: { provider: ProviderDetail }) {
  const { name, logoUrl, gameCount, category } = provider;

  return (
    <Card padding="lg">
      <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
        <LogoWell name={name} src={logoUrl} className="h-24 w-32" />
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-ink md:text-3xl">{name}</h1>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <Badge tone="accent">{gameCount}+ jocuri</Badge>
            {category ? <Badge tone="neutral">{category}</Badge> : null}
          </div>
        </div>
      </div>
    </Card>
  );
}
