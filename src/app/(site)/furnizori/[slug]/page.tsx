import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbSchema, faqPageSchema } from "@/lib/schema";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { FAQAccordion } from "@/components/ui/FAQAccordion";
import { CasinoCard } from "@/components/casino/CasinoCard";
import { GameCard } from "@/components/games/GameCard";
import { ProviderCard } from "@/components/providers/ProviderCard";
import { ProviderDetailHeader } from "@/components/providers/ProviderDetailHeader";
import { ProviderFacts } from "@/components/providers/ProviderFacts";
import { getProviderBySlug, getRelatedProviders } from "@/lib/db/providers";
import { buildMetadata, entityDefaultMeta } from "@/lib/seo";
import { getSeoForSlug } from "@/lib/db/seo";
import { getGamesForProvider } from "@/lib/db/games";
import { getCasinosForProvider } from "@/lib/db/casinos";

interface PageProps {
  params: Promise<{ slug: string }>;
}

// DB-backed detail: render per request (no build-time DB dependency).
export const instant = false;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const provider = await getProviderBySlug(slug);
  if (!provider) return {};
  return buildMetadata(entityDefaultMeta("provider", provider), await getSeoForSlug("provider", slug));
}

export default async function ProviderDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const provider = await getProviderBySlug(slug);
  if (!provider) notFound();

  const games = (await getGamesForProvider(slug)).slice(0, 8);
  const casinos = (await getCasinosForProvider(slug)).slice(0, 4);

  const related = await getRelatedProviders(slug);

  const crumbs = [
    { label: "Acasă", href: "/" },
    { label: "Furnizori", href: "/furnizori" },
    { label: provider.name },
  ];

  return (
    <div className="flex flex-col gap-8">
      <JsonLd data={breadcrumbSchema(crumbs)} />
      {provider.faq?.length ? <JsonLd data={faqPageSchema(provider.faq)} /> : null}
      <Breadcrumbs items={crumbs} />

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
