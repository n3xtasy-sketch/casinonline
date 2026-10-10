import type { Metadata } from "next";
import { NotFoundView } from "@/components/layout/NotFoundView";

/*
 * Design decision: invalid [slug] routes resolve here as a SOFT 404 — HTTP 200
 * with `noindex` (below) — not a hard 404. Under `cacheComponents`, [slug] pages
 * are Partial-Prerendered: the AppShell shell (uses `usePathname`, needs
 * `instant = false`) flushes a 200 before notFound() runs in the stream. All
 * route configs that would force a hard 404 (`dynamic`, `experimental_ppr`,
 * `dynamicParams`) are rejected by cacheComponents. `noindex` keeps invalid
 * slugs out of the index, so the SEO impact is negligible. Accepted trade-off.
 */


export const metadata: Metadata = {
  title: "Pagina nu a fost găsită",
  robots: { index: false, follow: true },
};

/** 404 for public routes — renders inside the (site) AppShell. */
export default function NotFound() {
  return <NotFoundView />;
}
