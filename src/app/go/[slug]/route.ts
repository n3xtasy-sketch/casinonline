import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

interface AffiliateLinkRow {
  url: string;
  placement: string;
}

/**
 * Affiliate redirect: /go/<casino-slug> → 302 to the operator's real URL.
 * Reads the casino's active affiliate_links (RLS exposes only is_active rows).
 * Prefers the review CTA link, falls back to any active link, and finally to
 * the on-site review page — never a 404. /go/ is disallowed in robots.ts.
 */
export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const db = getSupabaseServerClient();
  const { data } = await db
    .from("casinos")
    .select("affiliate_links(url, placement)")
    .eq("slug", slug)
    .maybeSingle();

  const links =
    (data as unknown as { affiliate_links: AffiliateLinkRow[] } | null)?.affiliate_links ?? [];
  const target = links.find((l) => l.placement === "review_cta")?.url ?? links[0]?.url;

  if (target && /^https?:\/\//.test(target)) {
    return NextResponse.redirect(target, 302);
  }
  // No active affiliate link for this slug → send to the on-site review instead of 404.
  return NextResponse.redirect(new URL(`/cazinouri-online/${slug}`, req.url), 302);
}
