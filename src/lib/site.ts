/** Central site configuration (used by metadata, sitemap, robots and JSON-LD). */
export const siteConfig = {
  name: "CasinOnline.ro",
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? "https://casinonline.ro").replace(/\/$/, ""),
  description:
    "Platformă premium de descoperire și comparare a cazinourilor online din România: bonusuri, jocuri, furnizori și metode de plată.",
  locale: "ro_RO",
};

/** Absolute URL for a site-relative path. */
export function absoluteUrl(path: string): string {
  if (path.startsWith("http")) return path;
  return `${siteConfig.url}${path.startsWith("/") ? path : `/${path}`}`;
}
