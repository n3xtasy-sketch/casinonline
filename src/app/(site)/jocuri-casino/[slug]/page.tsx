import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbSchema, faqPageSchema } from "@/lib/schema";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Badge } from "@/components/ui/Badge";
import { FAQAccordion } from "@/components/ui/FAQAccordion";
import { CasinoCard } from "@/components/casino/CasinoCard";
import { GameCard } from "@/components/games/GameCard";
import { GameDetailHeader } from "@/components/games/GameDetailHeader";
import { GameSpecs } from "@/components/games/GameSpecs";
import { getGameBySlug, getGames } from "@/lib/db/games";
import { buildMetadata, entityDefaultMeta } from "@/lib/seo";
import { getSeoForSlug } from "@/lib/db/seo";
import { getCasinosForGame } from "@/lib/db/casinos";

interface PageProps {
  params: Promise<{ slug: string }>;
}

// DB-backed detail: render per request (no build-time DB dependency).
export const instant = false;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const game = await getGameBySlug(slug);
  if (!game) return {};
  return buildMetadata(entityDefaultMeta("game", game), await getSeoForSlug("game", slug));
}

export default async function GameDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const game = await getGameBySlug(slug);
  if (!game) notFound();

  const casinos = await getCasinosForGame(slug);
  const playUrl = casinos[0]?.offerUrl;

  const similar = (await getGames())
    .filter(
      (g) =>
        g.slug !== slug &&
        (g.categorySlug === game.categorySlug || g.providerSlug === game.providerSlug),
    )
    .slice(0, 4);

  const crumbs = [
    { label: "Acasă", href: "/" },
    { label: "Jocuri", href: "/jocuri-casino" },
    { label: game.name },
  ];

  return (
    <div className="flex flex-col gap-8">
      <JsonLd data={breadcrumbSchema(crumbs)} />
      {game.faq?.length ? <JsonLd data={faqPageSchema(game.faq)} /> : null}
      <Breadcrumbs items={crumbs} />

      <GameDetailHeader game={game} playUrl={playUrl} />

      <section>
        <SectionHeader title={`Despre ${game.name}`} />
        <p className="max-w-[72ch] leading-relaxed text-ink-secondary">{game.intro}</p>
      </section>

      <section>
        <SectionHeader title="Specificații" />
        <GameSpecs game={game} />
      </section>

      <section>
        <SectionHeader title="Mecanici de joc" />
        <p className="max-w-[72ch] leading-relaxed text-ink-secondary">{game.mechanics}</p>
      </section>

      {game.bonusFeatures?.length ? (
        <section>
          <SectionHeader title="Funcții bonus" />
          <div className="flex flex-wrap gap-2">
            {game.bonusFeatures.map((f) => (
              <Badge key={f} tone="accent">
                {f}
              </Badge>
            ))}
          </div>
        </section>
      ) : null}

      {casinos.length ? (
        <section>
          <SectionHeader
            title={`Cazinouri unde poți juca ${game.name}`}
            action={{ label: "Toate cazinourile", href: "/cazinouri-online" }}
          />
          <div className="flex flex-col gap-4">
            {casinos.map((casino) => (
              <CasinoCard key={casino.slug} casino={casino} />
            ))}
          </div>
        </section>
      ) : null}

      {similar.length ? (
        <section>
          <SectionHeader
            title="Jocuri similare"
            action={{ label: "Vezi toate", href: "/jocuri-casino" }}
          />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {similar.map((g) => (
              <GameCard key={g.slug} game={g} />
            ))}
          </div>
        </section>
      ) : null}

      {game.faq?.length ? (
        <section>
          <SectionHeader title="Întrebări frecvente" />
          <FAQAccordion items={game.faq} />
        </section>
      ) : null}
    </div>
  );
}
