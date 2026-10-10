import { SectionHeader } from "@/components/ui/SectionHeader";
import { HeroSection } from "@/components/layout/HeroSection";
import { FAQAccordion } from "@/components/ui/FAQAccordion";
import { CasinoCard } from "@/components/casino/CasinoCard";
import { GameCard } from "@/components/games/GameCard";
import { BonusCard } from "@/components/bonuses/BonusCard";
import { ProviderCard } from "@/components/providers/ProviderCard";
import { GuideCard } from "@/components/guides/GuideCard";
import {
  getHomeCasinos,
  getHomeGames,
  getHomeBonuses,
  getHomeProviders,
  getHomeGuides,
} from "@/lib/db/home";
import { homeFaq } from "@/data/faq";
import { JsonLd } from "@/components/seo/JsonLd";
import { faqPageSchema } from "@/lib/schema";

// DB-backed homepage: render per request (no build-time DB dependency).
export const instant = false;

export default async function HomePage() {
  const [recommendedCasinos, popularGames, latestBonuses, popularProviders, latestGuides] =
    await Promise.all([
      getHomeCasinos(),
      getHomeGames(),
      getHomeBonuses(),
      getHomeProviders(),
      getHomeGuides(),
    ]);

  return (
    <div className="flex flex-col gap-12">
      <HeroSection
        title="Descoperă cele mai bune cazinouri online din România"
        description="Platformă premium de comparare: cazinouri, bonusuri, jocuri, furnizori și metode de plată — rapid, clar și de încredere."
        primaryCta={{ label: "Vezi cazinourile", href: "/cazinouri-online" }}
        secondaryCta={{ label: "Explorează bonusuri", href: "/bonusuri-casino" }}
      />

      {/* Recommended casinos */}
      <section>
        <SectionHeader
          title="Cazinouri recomandate"
          action={{ label: "Vezi toate", href: "/cazinouri-online" }}
        />
        <div className="flex flex-col gap-4">
          {recommendedCasinos.map((casino) => (
            <CasinoCard key={casino.slug} casino={casino} />
          ))}
        </div>
      </section>

      {/* Popular games */}
      <section>
        <SectionHeader
          title="Jocuri populare"
          action={{ label: "Vezi toate", href: "/jocuri-casino" }}
        />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
          {popularGames.map((game) => (
            <GameCard key={game.slug} game={game} />
          ))}
        </div>
      </section>

      {/* Latest bonuses */}
      <section>
        <SectionHeader
          title="Cele mai noi bonusuri"
          action={{ label: "Vezi toate", href: "/bonusuri-casino" }}
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {latestBonuses.map((bonus) => (
            <BonusCard key={bonus.slug} bonus={bonus} />
          ))}
        </div>
      </section>

      {/* Popular providers */}
      <section>
        <SectionHeader
          title="Furnizori populari"
          action={{ label: "Vezi toți", href: "/furnizori" }}
        />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {popularProviders.map((provider) => (
            <ProviderCard key={provider.slug} provider={provider} />
          ))}
        </div>
      </section>

      {/* Latest guides */}
      <section>
        <SectionHeader
          title="Ghiduri utile"
          action={{ label: "Vezi toate", href: "/ghiduri" }}
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {latestGuides.map((guide) => (
            <GuideCard key={guide.slug} guide={guide} />
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section>
        <JsonLd data={faqPageSchema(homeFaq)} />
        <SectionHeader title="Întrebări frecvente" />
        <FAQAccordion items={homeFaq} />
      </section>
    </div>
  );
}
