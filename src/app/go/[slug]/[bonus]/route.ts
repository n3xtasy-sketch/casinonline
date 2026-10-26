import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Per-bonus affiliate redirect: /go/<casino-slug>/<bonus-slug> → 302 to the operator URL
 * via get_bonus_affiliate_url (0029, SECURITY DEFINER). Priority: bonus-specific active link
 * → casino default (get_affiliate_url) → same-origin fallback to the casino review (never 404,
 * never an external open redirect). Only redirects to a stored https?:// URL. /go/ is
 * robots-disallowed; noindex header as defense in depth.
 */
export async function GET(req: Request, { params }: { params: Promise<{ slug: string; bonus: string }> }) {
  const { slug, bonus } = await params;
  const db = getSupabaseServerClient();
  const headers = { "X-Robots-Tag": "noindex" };

  const { data } = await db.rpc("get_bonus_affiliate_url", { p_casino_slug: slug, p_bonus_slug: bonus });
  if (typeof data === "string" && /^https?:\/\//.test(data)) {
    return NextResponse.redirect(data, { status: 302, headers });
  }
  return NextResponse.redirect(new URL(`/cazinouri-online/${slug}`, req.url), { status: 302, headers });
}
