import type { MetadataRoute } from "next";
import { absoluteUrl, siteConfig } from "@/lib/site";
import { getSlugs, type SlugRow } from "@/lib/db/slugs";
import { institutionalSitemapEntries } from "@/lib/institutional";
import { readyAuthors } from "@/lib/authors";

/** Dynamic sitemap covering every hub and detail route (slugs + lastModified from DB). */
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

  const detail: Array<[string, SlugRow[]]> = [
    ["/cazinouri-online", casinos],
    ["/jocuri-casino", games],
    ["/furnizori", providers],
    ["/metode-de-plata", payments],
    ["/bonusuri-casino", bonuses],
    ["/ghiduri", guides],
  ];

  // Latest content change → lastModified for the hub routes.
  const latestIso = detail
    .flatMap(([, rows]) => rows.map((r) => r.updatedAt))
    .filter(Boolean)
    .reduce((max, iso) => (iso > max ? iso : max), "");
  const latest = latestIso ? new Date(latestIso) : undefined;

  const hubEntries: MetadataRoute.Sitemap = hubs.map((path) => ({
    url: absoluteUrl(path),
    changeFrequency: "weekly",
    priority: path === "/" ? 1 : 0.8,
    ...(latest ? { lastModified: latest } : {}),
  }));

  const detailEntries: MetadataRoute.Sitemap = detail.flatMap(([base, rows]) =>
    rows.map((r) => ({
      url: absoluteUrl(`${base}/${r.slug}`),
      changeFrequency: "monthly" as const,
      priority: 0.6,
      ...(r.updatedAt ? { lastModified: new Date(r.updatedAt) } : {}),
    })),
  );

  // Institutional/EEAT pages — only the READY ones (empty until content ships).
  const institutionalEntries: MetadataRoute.Sitemap = institutionalSitemapEntries(siteConfig.url).map(
    (e) => ({ url: e.url, changeFrequency: e.changeFrequency, priority: e.priority }),
  );

  // Individual author profiles — only READY authors (hub /autori is already included above).
  const authorEntries: MetadataRoute.Sitemap = readyAuthors().map((a) => ({
    url: absoluteUrl(`/autori/${a.slug}`),
    changeFrequency: "yearly" as const,
    priority: 0.4,
  }));

  return [...hubEntries, ...detailEntries, ...institutionalEntries, ...authorEntries];
}
