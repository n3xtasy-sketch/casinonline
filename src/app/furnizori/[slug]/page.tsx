import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { FAQAccordion } from "@/components/ui/FAQAccordion";
import { CasinoCard } from "@/components/casino/CasinoCard";
import { GameCard } from "@/components/games/GameCard";
import { ProviderCard } from "@/components/providers/ProviderCard";
import { ProviderDetailHeader } from "@/components/providers/ProviderDetailHeader";
import { ProviderFacts } from "@/components/providers/ProviderFacts";
import { allProviders } from "@/data/providers";
import { allGames } from "@/data/games";
import { allCasinos } from "@/data/casinos";
import { getGameDetail } from "@/data/game-details";
import { getProviderDetail, getAllProviderSlugs } from "@/data/provider-details";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return getAllProviderSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const provider = getProviderDetail(slug);
  if (!provider) return {};
  return { title: `${provider.name} — Jocuri și cazinouri`, description: provider.intro };
}

export default async function ProviderDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const provider = getProviderDetail(slug);
  if (!provider) notFound();

  const games = allGames.filter((g) => g.providerSlug === slug).slice(0, 8);

  const casinoSlugs = new Set<string>();
  for (const g of allGames.filter((g) => g.providerSlug === slug)) {
    getGameDetail(g.slug)?.availableCasinos?.forEach((cs) => casinoSlugs.add(cs));
  }
  const casinos = [...casinoSlugs]
    .map((cs) => allCasinos.find((c) => c.slug === cs))
    .filter((c): c is NonNullable<typeof c> => c !== undefined)
    .slice(0, 4);

  const related = allProviders.filter((p) => p.slug !== slug).slice(0, 3);

  return (
    <div className="flex flex-col gap-8">
      <Breadcrumbs
        items={[
          { label: "Acasă", href: "/" },
          { label: "Furnizori", href: "/furnizori" },
          { label: provider.name },
        ]}
      />

      <ProviderDetailHeader provider={provider} />

      <section>
        <SectionHeader title={`Despre ${provider.name}`} />
        <p className="max-w-[72ch] leading-relaxed text-ink-secondary">{provider.intro}</p>
      </section>

      <section>
        <SectionHeader title="Informații cheie" />
        <ProviderFacts provider={provider} />
      </section>

      {games.length ? (
        <section>
          <SectionHeader
            title={`Jocuri populare ${provider.name}`}
            action={{ label: "Toate jocurile", href: "/jocuri-casino" }}
          />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {games.map((game) => (
              <GameCard key={game.slug} game={game} />
            ))}
          </div>
        </section>
      ) : null}

      {casinos.length ? (
        <section>
          <SectionHeader
            title={`Cazinouri cu jocuri ${provider.name}`}
            action={{ label: "Toate cazinourile", href: "/cazinouri-online" }}
          />
          <div className="flex flex-col gap-4">
            {casinos.map((casino) => (
              <CasinoCard key={casino.slug} casino={casino} />
            ))}
          </div>
        </section>
      ) : null}

      {provider.faq?.length ? (
        <section>
          <SectionHeader title="Întrebări frecvente" />
          <FAQAccordion items={provider.faq} />
        </section>
      ) : null}

      <section>
        <SectionHeader
          title="Furnizori similari"
          action={{ label: "Toți furnizorii", href: "/furnizori" }}
        />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {related.map((p) => (
            <ProviderCard key={p.slug} provider={p} />
          ))}
        </div>
      </section>
    </div>
  );
}
