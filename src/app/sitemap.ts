import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";
import { getCasinos } from "@/lib/db/casinos";
import { getGames } from "@/lib/db/games";
import { getProviders } from "@/lib/db/providers";
import { getPaymentMethods } from "@/lib/db/payments";
import { getBonuses } from "@/lib/db/bonuses";
import { getGuides } from "@/lib/db/guides";

/** Dynamic sitemap covering every hub and detail route (slugs come from DB). */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const hubs = [
    "/",
    "/cazinouri-online",
    "/jocuri-casino",
    "/furnizori",
    "/metode-de-plata",
    "/bonusuri-casino",
    "/ghiduri",
  ];

  const [casinos, games, providers, payments, bonuses, guides] = await Promise.all([
    getCasinos(),
    getGames(),
    getProviders(),
    getPaymentMethods(),
    getBonuses(),
    getGuides(),
  ]);

  const detail: Array<[string, string[]]> = [
    ["/cazinouri-online", casinos.map((c) => c.slug)],
    ["/jocuri-casino", games.map((g) => g.slug)],
    ["/furnizori", providers.map((p) => p.slug)],
    ["/metode-de-plata", payments.map((m) => m.slug)],
    ["/bonusuri-casino", bonuses.map((b) => b.slug)],
    ["/ghiduri", guides.map((g) => g.slug)],
  ];

  const hubEntries: MetadataRoute.Sitemap = hubs.map((path) => ({
    url: absoluteUrl(path),
    changeFrequency: "weekly",
    priority: path === "/" ? 1 : 0.8,
  }));

  const detailEntries: MetadataRoute.Sitemap = detail.flatMap(([base, slugs]) =>
    slugs.map((slug) => ({
      url: absoluteUrl(`${base}/${slug}`),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  );

  return [...hubEntries, ...detailEntries];
}
