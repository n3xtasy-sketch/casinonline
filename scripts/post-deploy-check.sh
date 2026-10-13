#!/usr/bin/env bash
# Post-deploy smoke test. Usage: ./scripts/post-deploy-check.sh https://casinonline.ro
# Checks public routes, admin protection, robots/sitemap/OG/canonical/JSON-LD,
# a /go redirect, and an invalid-slug (noindex/404). Prints PASS/FAIL and exits non-zero on any failure.
set -u

BASE="${1:-}"
if [ -z "$BASE" ]; then
  echo "Usage: $0 <BASE_URL>   (ex: $0 https://casinonline.ro)"
  exit 2
fi
BASE="${BASE%/}"

PASS=0; FAIL=0
ok()  { echo "  ✓ $1"; PASS=$((PASS+1)); }
bad() { echo "  ✗ $1"; FAIL=$((FAIL+1)); }
code() { curl -s -o /dev/null -w "%{http_code}" "$1"; }
body() { curl -s "$1"; }

echo "== Post-deploy check: $BASE =="

echo "- Hub & utility routes (200):"
for p in "/" "/cazinouri-online" "/jocuri-casino" "/bonusuri-casino" "/furnizori" "/metode-de-plata" "/ghiduri" "/sitemap.xml" "/robots.txt" "/opengraph-image"; do
  c=$(code "$BASE$p")
  [ "$c" = "200" ] && ok "$p -> 200" || bad "$p -> $c (aștept 200)"
done

echo "- Admin protection:"
AC=$(code "$BASE/admin")
case "$AC" in 301|302|307|308) ok "/admin -> $AC (redirect)";; *) bad "/admin -> $AC (aștept redirect la login)";; esac
LC=$(curl -s -o /dev/null -w "%{redirect_url}" "$BASE/admin")
echo "$LC" | grep -q "/admin/login" && ok "/admin redirect → login" || bad "/admin redirect → ${LC:-?} (aștept /admin/login)"
[ "$(code "$BASE/admin/login")" = "200" ] && ok "/admin/login -> 200" || bad "/admin/login nu e 200"

echo "- robots.txt:"
R=$(body "$BASE/robots.txt")
echo "$R" | grep -qi "sitemap" && ok "robots menționează sitemap" || bad "robots fără sitemap"
echo "$R" | grep -qiE "disallow:\s*/(admin|go)" && ok "robots disallow /admin sau /go" || bad "robots fără disallow /admin|/go"

echo "- sitemap.xml:"
SM=$(body "$BASE/sitemap.xml")
echo "$SM" | grep -qi "<urlset" && ok "sitemap are <urlset>" || bad "sitemap fără <urlset>"
SM_COUNT=$(echo "$SM" | grep -oc "<loc>")
echo "    (loc entries: $SM_COUNT)"
[ "$SM_COUNT" -gt 0 ] && ok "sitemap conține URL-uri ($SM_COUNT)" || bad "sitemap gol (populează+publică înainte de submit)"

echo "- Homepage metadata:"
HOME=$(body "$BASE/")
echo "$HOME" | grep -qE '<link[^>]*rel="canonical"' && ok "canonical prezent" || bad "canonical lipsă"
echo "$HOME" | grep -q 'property="og:title"' && ok "og:title prezent" || bad "og:title lipsă"
echo "$HOME" | grep -q 'property="og:image"' && ok "og:image prezent" || bad "og:image lipsă"

echo "- JSON-LD valid:"
echo "$HOME" | python3 -c '
import sys,re,json
html=sys.stdin.read()
blocks=re.findall(r"<script[^>]*application/ld\+json[^>]*>(.*?)</script>", html, re.S)
if not blocks:
    print("NONE"); sys.exit(3)
for b in blocks:
    json.loads(b)
print(len(blocks))
' >/tmp/jsonld.out 2>/tmp/jsonld.err
if [ $? -eq 0 ]; then ok "JSON-LD valid ($(cat /tmp/jsonld.out) blocuri)"; else bad "JSON-LD lipsă/invalid ($(cat /tmp/jsonld.err | head -1))"; fi

echo "- Casino detail + /go (slug descoperit din sitemap):"
CSLUG=$(echo "$SM" | grep -oE "/cazinouri-online/[a-z0-9-]+" | grep -v "^/cazinouri-online$" | head -1 | sed 's#/cazinouri-online/##')
if [ -n "$CSLUG" ]; then
  [ "$(code "$BASE/cazinouri-online/$CSLUG")" = "200" ] && ok "detail /cazinouri-online/$CSLUG -> 200" || bad "detail casino nu e 200"
  GLOC=$(curl -s -o /dev/null -w "%{redirect_url}" "$BASE/go/$CSLUG")
  [ -n "$GLOC" ] && ok "/go/$CSLUG -> redirect ($GLOC)" || bad "/go/$CSLUG fără redirect"
else
  echo "  (niciun casino în sitemap — sari peste detail/go; normal dacă încă n-ai publicat)"
fi

echo "- Slug invalid (404 sau noindex):"
INV=$(body "$BASE/cazinouri-online/__nope-$(date +%s)__")
INVC=$(code "$BASE/cazinouri-online/__nope-xyz-123__")
if [ "$INVC" = "404" ] || echo "$INV" | grep -qi "noindex"; then ok "slug invalid -> 404/noindex"; else bad "slug invalid -> $INVC fără noindex (risc de indexare)"; fi

echo ""
echo "== REZULTAT: $PASS PASS / $FAIL FAIL =="
if [ "$FAIL" -eq 0 ]; then echo "✅ PASS"; exit 0; else echo "❌ FAIL"; exit 1; fi
