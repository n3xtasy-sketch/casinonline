import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";
import { getAllCasinoSlugs } from "@/data/casino-details";
import { getAllGameSlugs } from "@/data/game-details";
import { getAllProviderSlugs } from "@/data/provider-details";
import { getAllPaymentSlugs } from "@/data/payment-details";
import { getAllBonusSlugs } from "@/data/bonus-details";
import { getAllGuideSlugs } from "@/data/guide-details";

/** Dynamic sitemap covering every known static and detail route. */
export default function sitemap(): MetadataRoute.Sitemap {
  const hubs = [
    "/",
    "/cazinouri-online",
    "/jocuri-casino",
    "/furnizori",
    "/metode-de-plata",
    "/bonusuri-casino",
    "/ghiduri",
  ];

  const detail: Array<[string, string[]]> = [
    ["/cazinouri-online", getAllCasinoSlugs()],
    ["/jocuri-casino", getAllGameSlugs()],
    ["/furnizori", getAllProviderSlugs()],
    ["/metode-de-plata", getAllPaymentSlugs()],
    ["/bonusuri-casino", getAllBonusSlugs()],
    ["/ghiduri", getAllGuideSlugs()],
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
