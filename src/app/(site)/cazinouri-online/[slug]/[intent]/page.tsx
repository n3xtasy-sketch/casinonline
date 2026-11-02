import { notFound } from "next/navigation";
import { connection } from "next/server";
import type { Metadata } from "next";
import { isValidIntent, evergreenBonusMatches } from "@/lib/evergreen-bonus";
import { getPublishedEvergreenPage, getFeaturedBonus, isOfferLive } from "@/lib/db/seo-bonus-pages";
import { EvergreenBonusPage, evergreenMetadata } from "@/components/seo/EvergreenBonusPage";

interface PageProps {
  params: Promise<{ slug: string; intent: string }>;
}

// DB-backed: render per request (no build-time DB dependency).
export const instant = false;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug, intent } = await params;
  if (!isValidIntent(intent)) return {};
  const page = await getPublishedEvergreenPage(slug, intent);
  return page ? evergreenMetadata(page) : {};
}

export default async function EvergreenBonusRoute({ params }: PageProps) {
  // Per-request render so the offer's live/expiry decision is evaluated against the CURRENT
  // date each request (never frozen in cache). Offer DATA stays cached via the loaders.
  await connection();
  const { slug, intent } = await params;

  // A page exists publicly only when: intent is valid, operator is published, and the
  // seo_bonus_pages row is published. We never auto-generate operator × intent combinations.
  if (!isValidIntent(intent)) notFound();
  const page = await getPublishedEvergreenPage(slug, intent);
  if (!page) notFound();

  let featured = page.featuredBonusId ? await getFeaturedBonus(page.featuredBonusId) : null;
  // Defensive (CMS also validates): the featured offer must still match this SEO intent.
  if (featured && !evergreenBonusMatches(intent, {
    typeSlug: featured.typeSlug,
    freeSpins: featured.freeSpinsForMatch,
    isNoDeposit: featured.isNoDeposit,
    isNoWagering: featured.isNoWagering,
  })) {
    featured = null;
  }

  const today = new Date().toISOString().slice(0, 10); // per-request date (after connection())
  const isLive = featured ? isOfferLive(featured, today) : false;

  return <EvergreenBonusPage page={page} featured={featured} isLive={isLive} />;
}
