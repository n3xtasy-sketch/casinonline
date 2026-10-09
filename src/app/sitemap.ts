import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";
import { getSlugs } from "@/lib/db/slugs";

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
    getSlugs("casinos"),
    getSlugs("games"),
    getSlugs("providers"),
    getSlugs("payment_methods"),
    getSlugs("bonuses"),
    getSlugs("guides"),
  ]);

  const detail: Array<[string, string[]]> = [
    ["/cazinouri-online", casinos],
    ["/jocuri-casino", games],
    ["/furnizori", providers],
    ["/metode-de-plata", payments],
    ["/bonusuri-casino", bonuses],
    ["/ghiduri", guides],
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
