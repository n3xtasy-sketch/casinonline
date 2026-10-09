import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

interface AffiliateLinkRow {
  url: string;
  placement: string;
}

/**
 * Affiliate redirect: /go/<casino-slug> → 302 to the operator's real URL.
 *
 * Preferred path: the SECURITY DEFINER RPC `get_affiliate_url` (migration 0003)
 * lets the anon role resolve the URL WITHOUT reading the affiliate_links table
 * directly over REST — no service_role involved. Falls back to a direct read for
 * environments where the RPC isn't deployed yet. Finally falls back to the
 * on-site review page (never a 404). /go/ is disallowed in robots.ts.
 */
export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const db = getSupabaseServerClient();

  const rpc = await db.rpc("get_affiliate_url", { p_slug: slug });
  if (!rpc.error && typeof rpc.data === "string" && /^https?:\/\//.test(rpc.data)) {
    return NextResponse.redirect(rpc.data, 302);
  }

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
