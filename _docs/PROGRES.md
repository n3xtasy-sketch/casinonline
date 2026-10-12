# CasinOnline.ro — Stare proiect

> Platformă de afiliere cazinouri online (RO), Next.js + Supabase.
> Actualizat: 2026-10-12. Acest document e strict documentație (nu reflectă cod funcțional modificat la scriere).

---

## 1. Stack tehnic

| Strat | Tehnologie |
|---|---|
| Framework | Next.js **16.4** (App Router, Turbopack) |
| UI | React **19.3**, Tailwind CSS **v4** (`@theme` tokens în `globals.css`) |
| Iconițe | lucide-react |
| Limbaj | TypeScript 5 (strict) |
| Date | Supabase (Postgres + RLS), `@supabase/ssr` 0.12.7, `@supabase/supabase-js` 2.117.3 |
| Auth admin | Supabase Auth (cookie-based, cheie anon) |
| Rendering | Partial Prerendering via `cacheComponents: true` + `partialPrefetching: true` |

**Config cheie** (`next.config.ts`): `cacheComponents: true` (PPR). Consecință: config-urile de rută `dynamic`, `experimental_ppr`, `dynamicParams` sunt **respinse** la build — vezi decizia soft-404 (§13).

---

## 2. Structură rute

### Public — route group `(site)` (layout cu `AppShell` + JSON-LD org/website)
- `/` — homepage (cazinouri recomandate, jocuri populare, bonusuri recente, furnizori, ghiduri + RightSidebar)
- `/cazinouri-online` + `/cazinouri-online/[slug]`
- `/jocuri-casino` + `/jocuri-casino/[slug]`
- `/furnizori` + `/furnizori/[slug]`
- `/metode-de-plata` + `/metode-de-plata/[slug]`
- `/bonusuri-casino` + `/bonusuri-casino/[slug]`
- `/ghiduri` + `/ghiduri/[slug]`
- `/go/[slug]` — redirect afiliat (route handler, 302, robots-disallowed)
- `sitemap.ts`, `robots.txt`, `opengraph-image`, `(site)/not-found.tsx`

### Admin — `/admin` (noindex) → route group `(panel)` (guard `is_admin`, `AdminShell`)
- `/admin/login`
- `/admin` (dashboard)
- `/admin/cazinouri` (+ `/nou`, `/[slug]/edit`) — cu arhivare
- `/admin/bonusuri` (+ `/nou`, `/[slug]/edit`)
- `/admin/jocuri` (+ `/nou`, `/[slug]/edit`)
- `/admin/furnizori` (+ `/nou`, `/[slug]/edit`)
- `/admin/metode-de-plata` (+ `/nou`, `/[slug]/edit`)
- `/admin/ghiduri` (+ `/nou`, `/[slug]/edit`)
- `/admin/affiliate-links` (+ `/nou`, `/[id]/edit`)

`src/proxy.ts` (nu `middleware.ts` — redenumit în Next 16): reîmprospătează sesiunea Supabase și redirecționează `/admin/*` neautentificat la `/admin/login`. Guard-ul de rol `is_admin` se face server-side în `(panel)/layout.tsx`.

---

## 3. Module publice finalizate

Toate paginile publice citesc **server-side din Supabase** (cheie anon), fără mock:
Cazinouri · Jocuri · Furnizori · Metode de plată · Bonusuri · Ghiduri · Homepage + RightSidebar · redirect afiliat `/go` · sitemap/robots/OG.

Readere în `src/lib/db/`: `casinos.ts`, `games.ts`, `providers.ts`, `payments.ts`, `bonuses.ts`, `guides.ts`, `home.ts`, `slugs.ts` (+ helperele admin, vezi §9).

---

## 4. Supabase — schema & relații

**Entități:** `casinos`, `games`, `providers`, `payment_methods`, `bonuses`, `guides`.
**Vocabulare (lookup):** `tags`, `bonus_types`, `payment_types`, `game_categories`, `guide_categories`.
**Afiliere:** `affiliate_links` (casino_id, placement, url, campaign, is_active).
**Junction M2M:** `casino_tags`, `casino_payment_methods`, `casino_games`.
**Auth/rol:** `profiles` (id → auth.users, `is_admin`).
**Derivat:** view casino↔provider (prin `casino_games` → `games.provider_id`), `security_invoker`.

Relații cheie:
- `games.provider_id → providers`, `games.category_id → game_categories`
- `bonuses.casino_id → casinos`, `bonuses.bonus_type_id → bonus_types`
- `payment_methods.payment_type_id → payment_types`
- `guides.category_id → guide_categories`
- `affiliate_links.casino_id → casinos` (ON DELETE CASCADE)
- `casinos.status` (`active`|`archived`) — soft-archive (vezi §8/§11)
- `providers.game_count` — menținut automat de trigger din `count(*)` pe `games`

JSON structurat în coloane: `faq` (`[{question,answer}]`), `sections` ghiduri (`[{id,heading,level,body[]}]`), `related_links`, `pros`/`cons`/`bonus_features` (text[]).

---

## 5. Caching

- Readerele publice: `"use cache"` + `cacheLife("hours")` + `cacheTag("<entitate>")` (`casinos`, `games`, `providers`, `payments`, `bonuses`, `guides`; sitemap tag-at după numele tabelului).
- Invalidare la scriere (admin): `updateTag("<tag>")` (API Next 16, **nu** `revalidateTag`).
  - Casino → `updateTag("casinos")`; Bonus → `casinos`+`bonuses`; Joc → `games`+`casinos`+`providers`; Furnizor → `providers`+`games`; Metodă → `payments`+`casinos`; Ghid → `guides`; Arhivare casino → `casinos`+`bonuses`.
- **Affiliate Links: fără `updateTag`** — `/go` rezolvă live prin RPC, nicio pagină cache-uită nu depinde de ele.
- `(panel)/layout.tsx` folosește `connection()` pentru a forța dynamic (evită eroarea `Date.now()` din clientul Supabase sub `cacheComponents`).

---

## 6. SEO / Structured Data / OG

- Metadata per pagină: title template, description, canonical `url`, `openGraph` (siteName „CasinOnline.ro", `type` website/article), Twitter.
- JSON-LD: `Organization` + `WebSite` (în layout `(site)`), `FAQPage`, `Review` editorial pe cazinouri, `Article` (datePublished/dateModified) pe ghiduri, `ItemList` pe listinguri.
- `sitemap.ts` dinamic (slug + lastModified din DB; respectă RLS → exclude cazinourile arhivate), `robots.txt` (dezalow `/go` și `/admin`).
- `safeJsonLd`: escaping `</script>`, `<`, `>`, `&`, U+2028/U+2029.

---

## 7. Security hardening

- JSON-LD escaping complet (vezi §6).
- `related_links` ghiduri: doar rute interne (`isSafeInternalPath` — un singur `/` la început, fără `//`/`\`/control chars); validat la scriere în admin **și** filtrat defensiv la citire.
- `affiliate_links`: anon **nu** citește tabelul direct; rezolvarea URL-ului se face prin RPC `get_affiliate_url` (`SECURITY DEFINER`).
- `service_role` **niciodată** în runtime public / client; doar cheia anon în aplicație.
- `.env.local` necomis (vezi §14).

---

## 8. RLS (Row Level Security)

- Toate tabelele au RLS activ. `public SELECT` permisiv pe conținut, **cu excepția**:
  - `affiliate_links`: anon fără acces direct (doar RPC).
  - `casinos`: anon + authenticated văd doar `status='active'`; adminii (`is_admin()`) văd tot (vezi §11, 0012).
- Scrieri admin-only prin funcția `SECURITY DEFINER` `is_admin()` (0006): policy-uri `insert/update` pe toate entitățile, `insert/delete` pe junction-uri. **Fără DELETE fizic** pe entități (niciun grant de delete; `affiliate_links` are `revoke delete` explicit — 0013).
- `profiles`: self-read; `is_admin` nu e editabil din aplicație.

---

## 9. Faze Admin — toate finalizate

| Fază | Modul | Esență |
|---|---|---|
| 1 | Auth + Shell | Supabase Auth, `/admin/login`, guard `is_admin` server-side, `AdminShell`, dashboard; fără CRUD |
| 2 | Cazinouri read-only | listing din DB |
| 3 | Cazinouri write | create/edit, slug create-only, junction sync (tags/payments/games), affiliate `review_cta` |
| 4 | Bonusuri | create/edit, `claim_url` derivat `/go/<casino-slug>` |
| 5 | Jocuri | create/edit, multi-select cazinouri, trigger `game_count` |
| 6 | Furnizori | create/edit, `game_count` read-only (owned de trigger) |
| 7 | Metode de plată | create/edit, multi-select cazinouri |
| 8 | Ghiduri | create/edit, editor `sections` „markdown-ish" (`##`/`###`, ids auto), `related_links` interne, published/updated |
| — | Arhivare cazinouri | `status active/archived`, soft-delete, RLS, taburi Active/Arhivate |
| — | Affiliate Links | listing+filtre, add/edit, toggle `is_active`, placement controlat, https-only, unicitate activ |

**Reguli transversale:** slug editabil doar la CREATE (read-only la EDIT); fără DELETE fizic (dezactivare/arhivare prin status/`is_active`); `requireAdmin()` server-side lângă RLS; `updateTag` la nevoie; prevenire duplicate slug.

Helperele admin: `src/lib/db/admin-{casinos,bonuses,games,providers,payments,guides,affiliates}.ts` (sesiune admin — văd și rândurile arhivate/inactive); `src/lib/guide-format.ts`, `src/lib/affiliate-placements.ts` (helpere pure, reutilizate).

---

## 10. Migrări 0001–0013

| # | Fișier | Descriere |
|---|---|---|
| 0001 | `initial_schema` | Schema completă: entități, lookup-uri, junction, `affiliate_links`, `profiles`, RLS inițial (`casinos read` using true), indexuri, trigger `updated_at`, view casino↔provider |
| 0002 | `order_indexes` | Indexuri pentru coloanele de ORDER BY (rating, editor_score, game_count etc.) |
| 0003 | `affiliate_links_rpc` | `get_affiliate_url(slug)` `SECURITY DEFINER` (preferă `review_cta`, doar `is_active`); drop policy read anon + revoke select anon |
| 0004 | `affiliate_links_revoke_authenticated` | Revoke select direct pe `affiliate_links` pentru `authenticated` (acces doar prin RPC) |
| 0005 | `profiles_admin` | Tabel `profiles` + `is_admin`, RLS self-read, trigger `handle_new_user`, RPC count affiliate |
| 0006 | `casino_write_rls` | Helper `is_admin()`; grant/policy insert+update pe `casinos` (fără delete), insert/delete pe junction, all pe `affiliate_links` — toate gated `is_admin()` |
| 0007 | `bonus_write_rls` | Grant/policy admin insert+update pe `bonuses` (idempotent) |
| 0008 | `game_write_rls` | Grant/policy admin pe `games` + trigger `SECURITY DEFINER` care sincronizează `providers.game_count` din `count(*)` (recalc și provider vechi, și nou la edit) |
| 0009 | `provider_write_rls` | Grant/policy admin insert+update pe `providers` |
| 0010 | `payment_write_rls` | Grant/policy admin insert+update pe `payment_methods` (junction acoperit de 0006) |
| 0011 | `guide_write_rls` | Grant/policy admin insert+update pe `guides` |
| 0012 | `casino_archive` | Coloană `casinos.status` (`active`/`archived`, default active, CHECK) + index; înlocuiește `casinos read` cu policy „anon=active / admin=tot"; `get_affiliate_url` capătă `and c.status='active'` |
| 0013 | `affiliate_links_constraints` | CHECK placement ∈ {review_cta,bonus_claim,listing_card}; CHECK `url ~ '^https://'`; unique parțial `(casino_id,placement,coalesce(campaign,'')) WHERE is_active`; `revoke delete` |

> Migrările se aplică **manual în Supabase SQL Editor** (DDL nu rulează prin clientul anon/REST). Toate 0007–0013 sunt idempotente (`drop … if exists` / `if not exists`).

---

## 11. Decizii tehnice importante

- **Soft-404 + noindex** pentru `[slug]` invalide: sub `cacheComponents` nu se poate forța HTTP 404 „hard" universal fără a sacrifica caching-ul (config-urile `dynamic`/`dynamicParams`/`experimental_ppr` sunt respinse la build). Decizie: păstrăm soft-404 (shell 200) + `robots: noindex` pe `(site)/not-found.tsx`. Observație: unele rute de detail ajung totuși la 404 real când readerul întoarce `null`. Subiect închis.
- **Arhivare prin RLS, nu filtre per-query:** o singură politică pe `casinos` (anon=active) exclude automat cazinourile arhivate din toate căile anon — listinguri, detail, related, embed-uri game/provider/payment, sidebar, sitemap. RPC-ul (SECURITY DEFINER, ocolește RLS) primește filtru explicit `status='active'`. Bonusurile cazinoului arhivat: embed-ul `casino` devine `null` → ascunse public (listing + 404 pe detail), dar rămân în DB și vizibile/editabile în admin.
- **`game_count` menținut de trigger**, nu manual (evită valori stale; recalc automat la orice modificare de joc).
- **Affiliate: unicitate pe link activ** `(casino, placement, campaign)`; campania `null` = slotul „default" (folosit de `/go`); mai multe campanii active per placement sunt permise. `get_affiliate_url` preferă `review_cta`, dar cade pe orice link activ; fallback on-site doar când nu există niciun link activ.
- **`updateTag` vs `revalidateTag`:** Next 16 — se folosește `updateTag` (single-arg, mutation-time).
- **`proxy.ts`** în loc de `middleware.ts` (redenumit în Next 16).

---

## 12. Commit-uri importante

**Public → Supabase:** `68b23fd` schema+seed · `f99392e`/`9a996e2`/`b68785a`/`dfc02f8`/`ede78f9`/`6041216` conectare module · `5333a8a` homepage+sidebar · `1a4411d` caching · `325fbc4` `/go` redirect.
**SEO/a11y/security:** `336044b` fix 404 links · `d950c08` structured data · `f6a6c2c` OpenGraph · `84be905` accessibility · `61e3dea` micro-optimizări Supabase · `d9ea174` + `1fac7ae` security/a11y hardening.
**Admin:** `a3fd47a` Faza 1 · `2a98c3c` decizie soft-404 · `f796f77` Faza 2 · `977ceb5` Faza 3 · `f58c0e4` Faza 4 · `8c0eaea` Faza 5 · `5183cfc` Faza 6 · `715ab92` Faza 7 · `b087690` Faza 8 · `5b5c673` arhivare cazinouri · `92b5bba` Affiliate Links.

---

## 13. Lăsate intenționat nefăcute

- **Login user public** (cont de vizitator) — nu există; auth e doar pentru admin.
- **Favorite / salvate** de utilizator.
- **Reviews / rating de la utilizatori** (rating-urile sunt editoriale).
- **DELETE fizic** oriunde — înlocuit cu arhivare (`casinos.status`) / dezactivare (`affiliate_links.is_active`).
- **Automatizare rebuild/redeploy** la slug nou (nu e necesară cu varianta soft-404 curentă — slug-urile noi sunt accesibile on-demand imediat).
- **Modul Furnizori/Metode „delete"**, management avansat de media/upload imagini (momentan URL-uri).

---

## 14. Workflow de dezvoltare & comenzi

```bash
npm run dev      # Next dev (Turbopack) → http://localhost:3000
npm run build    # build de producție
npm run start    # server de producție (după build)
npm run lint     # ESLint
npx tsc --noEmit # typecheck
```

**Ritm de lucru:** pentru fiecare modul — (1) propunere + SQL migrare, aprobare; (2) migrarea se pune pe clipboard (`pbcopy`) și o aplică utilizatorul manual în Supabase SQL Editor (Claude nu rulează DDL); (3) implementare; (4) `build`+`typecheck`+`lint`+runtime; (5) test end-to-end; (6) commit după validare. Verificarea datelor se face prin REST cu `service_role` în scripturi one-off (doar local, niciodată în runtime).

---

## 15. `.env.local` & secrete

- `.env.local` **NU se comite** (`.gitignore`: `.env*`).
- Chei: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
- `SUPABASE_SERVICE_ROLE_KEY` se folosește **exclusiv** în scripturi de verificare/mentenanță locale — **niciodată** importat în cod de aplicație (server components, actions, route handlers). Aplicația folosește doar cheia anon + sesiunea de auth.

---

## 16. Status Lighthouse (audit final)

Țintele au fost atinse la auditul final (pasul 8 remediere):
- **SEO:** 95+
- **Performance:** 95+
- **Best Practices:** 100
- **Accessibility:** 95+

(a11y: contrast AA pe `ink-muted`, skip-link, `aria-pressed` pe FilterChips, `prefers-reduced-motion`, MobileNav ca dialog cu focus-trap, landmark-uri cu `aria-label`, ordine corectă a heading-urilor.)
