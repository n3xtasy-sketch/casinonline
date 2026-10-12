import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getRedirect } from "@/lib/redirects-cache";
import { normalizePath } from "@/lib/redirects";

/**
 * Proxy (ex-middleware), two branches:
 *  - /admin/*  → refresh Supabase auth session + gate (no session → /admin/login).
 *  - everything else → admin-managed redirect lookup (cached TTL map; no per-request DB).
 *
 * The matcher already excludes /_next, /api, /go and asset files, so those are never
 * touched. Public requests do NOT create a Supabase auth client (no getUser per page).
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith("/admin")) {
    const hit = await getRedirect(normalizePath(pathname));
    if (hit) {
      const url = request.nextUrl.clone();
      url.pathname = hit.to; // internal path (validated at write time)
      url.hash = "";
      return NextResponse.redirect(url, hit.code);
    }
    return NextResponse.next();
  }

  // /admin branch — unchanged auth behaviour.
  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (pathname !== "/admin/login" && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  // All routes except Next internals, api, /go, and asset files (with an extension).
  // /admin/* still matches (no dot) → handled by the auth branch above.
  matcher: ["/((?!_next/|api/|go/|.*\\.).*)"],
};
