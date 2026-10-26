import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Affiliate redirect: /go/<casino-slug> → 302 to the operator's real URL via the
 * SECURITY DEFINER RPC get_affiliate_url (migration 0003) — anon can resolve the
 * URL without reading affiliate_links directly. If there's no active link, fall
 * back to the on-site review (same-origin, never a 404). /go/ is robots-disallowed.
 */
export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const db = getSupabaseServerClient();

  const headers = { "X-Robots-Tag": "noindex" };
  const { data } = await db.rpc("get_affiliate_url", { p_slug: slug });
  if (typeof data === "string" && /^https?:\/\//.test(data)) {
    return NextResponse.redirect(data, { status: 302, headers });
  }

  return NextResponse.redirect(new URL(`/cazinouri-online/${slug}`, req.url), { status: 302, headers });
}
