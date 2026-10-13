# CasinOnline.ro — Documentație v1.0

> Platformă de afiliere cazinouri online (RO), Next.js 16 + Supabase.
> Single source of truth. Actualizat: 2026-10-13.

---

## Status

**Platforma este feature-complete (v1.0).**
Toate modulele publice și întregul backoffice (admin) sunt implementate, testate și documentate.
Dezvoltările viitoare sunt **evolutive** (feature-uri noi — vezi *Roadmap v2*), nu infrastructură de bază.

Un dezvoltator nou ar trebui să înțeleagă arhitectura și filosofia din acest document în < 1 oră.

---

## Principii de arhitectură

Regulile care guvernează tot proiectul. Orice cod nou le respectă.

1. **RLS este întotdeauna sursa de adevăr** pentru vizibilitate/acces — nu filtre împrăștiate în query-uri.
2. **Fără `service_role` în runtime** (app/server/edge). Aplicația folosește doar cheia anon + sesiunea de auth; `service_role` doar în scripturi locale de mentenanță.
3. **Slug-urile sunt imuabile** — editabile doar la CREATE, read-only la EDIT; sunt chei stabile (redirect-uri, SEO, import/export).
4. **Nu există DELETE fizic de conținut** — soft prin `status='archived'` (entități) / `is_active=false` (affiliate links). Media + activity sunt excepții operaționale.
5. **`status` (content_status) controlează vizibilitatea publică** — publicul vede doar `published`; adminul vede tot.
6. **Server Actions pentru toate mutațiile** (admin-only, gated `requireAdmin()` + RLS). Public = doar citiri.
7. **`cacheTag()` + `updateTag()`** (Next 16) pentru cache/invalidare — nu `revalidatePath`/`revalidateTag` legacy.
8. **Un helper comun înaintea logicii duplicate** (ex. `applyStatusChange`, `logActivity`, `buildMetadata`, validator import) — dar acțiuni publice separate per entitate când logica poate diverge.
9. **FK prin slug** la import/export (nu UUID-uri brute) — fișiere lizibile și portabile.
10. **Media exclusiv în Supabase Storage** (bucket public, write admin-only); entitățile stochează doar URL-ul.

---

## 1. Stack tehnic

| Strat | Tehnologie |
|---|---|
| Framework | Next.js **16.4** (App Router, Turbopack, `cacheComponents` PPR) |
| UI | React **19.3**, Tailwind CSS **v4** (`@theme` tokens), lucide-react |
| Limbaj | TypeScript 5 strict |
| Date | Supabase (Postgres + RLS + Storage), `@supabase/ssr` 0.12, `supabase-js` 2.117 |
| Auth | Supabase Auth (cookie, cheie anon) — doar pentru admin |
| Config | `next.config.ts`: `cacheComponents`, `partialPrefetching`, `experimental.serverActions.bodySizeLimit=6mb` |

---

## 2. Structură rute

**Public — `(site)`** (layout `AppShell` + JSON-LD org/website): `/`, `/cazinouri-online[/slug]`, `/jocuri-casino[/slug]`, `/furnizori[/slug]`, `/metode-de-plata[/slug]`, `/bonusuri-casino[/slug]`, `/ghiduri[/slug]`, `/go/[slug]` (redirect afiliat 302), `sitemap.ts`, `robots.txt`, `opengraph-image`.

**Admin — `/admin`** (noindex) → `(panel)` (guard `is_admin`, `AdminShell`): `/admin/login`, `/admin` (dashboard), `cazinouri`, `bonusuri`, `jocuri`, `furnizori`, `metode-de-plata`, `ghiduri`, `affiliate-links`, `media`, `seo`, `redirects`, `activity`, `import` (fiecare cu `/nou` + `/[slug|id]/edit` unde e cazul) + `/admin/export/[entity]` (route handler download).

**`src/proxy.ts`** (ex-middleware, Next 16) — 2 branch-uri: `/admin/*` → refresh sesiune + gate login; restul → lookup redirect (cache TTL). Matcher exclude `/_next`, `/api`, `/go`, asset-uri.

---

## 3. Module publice (finalizate)

Toate citesc server-side din Supabase (cheie anon, gated RLS = doar `published`): Cazinouri · Jocuri · Furnizori · Metode de plată · Bonusuri · Ghiduri · Homepage + RightSidebar · redirect `/go` · sitemap/robots/OG. Readere în `src/lib/db/`.

---

## 4. Module Admin (complete)

| Modul | Status | Commit |
|---|---|---|
| Auth + Shell | ✅ | `a3fd47a` |
| Dashboard + Health | ✅ | `ed40b77` |
| Casinos CRUD | ✅ | `977ceb5` |
| Bonuses CRUD | ✅ | `f58c0e4` |
| Games CRUD | ✅ | `8c0eaea` |
| Providers CRUD | ✅ | `5183cfc` |
| Payment Methods CRUD | ✅ | `715ab92` |
| Guides CRUD | ✅ | `b087690` |
| Casino Archive | ✅ | `5b5c673` |
| Affiliate Links | ✅ | `92b5bba` |
| Media Library | ✅ | `e7eb4d0` |
| SEO Manager | ✅ | `b6b4bdd` |
| Bulk Actions | ✅ | `1fe1cbe` |
| Redirect Manager | ✅ | `37bba58` |
| Activity Log | ✅ | `0ac75b6` |
| Draft / Published | ✅ | `dd0aa17` |
| Import / Export | ✅ | `fe7bf68` |

**Reguli transversale admin:** slug create-only · fără DELETE fizic · `requireAdmin()` + RLS · `updateTag` la mutație · activity log pe toate mutațiile · conținut nou = `draft`.

---

## 5. Supabase — schema & relații

**Entități de conținut** (toate au `status content_status`): `casinos`, `games`, `providers`, `payment_methods`, `bonuses`, `guides`.
**Lookup-uri** (public, fără status): `tags`, `bonus_types`, `payment_types`, `game_categories`, `guide_categories`.
**Afiliere:** `affiliate_links` (casino_id, placement, url, campaign, is_active) — CHECK placement + https + unique parțial activ (0013).
**Junction M2M:** `casino_tags`, `casino_payment_methods`, `casino_games`.
**Infrastructură:** `profiles` (is_admin), `seo_metadata` (polimorf entity_type+entity_id), `redirects`, `activity_log` (append-only).
**ENUM:** `content_status = draft | published | archived`.
**Storage:** bucket public `media` (foldere casinos/games/providers/guides/payments/general).

Relații cheie: `games.provider_id/category_id`, `bonuses.casino_id/bonus_type_id`, `payment_methods.payment_type_id`, `guides.category_id`, `affiliate_links.casino_id` (cascade). `providers.game_count` menținut de trigger (0008). JSON în coloane: `faq`, `sections` (ghiduri), `related_links`, `pros/cons/bonus_features` (text[]).

---

## 6. Caching

- Readere publice: `"use cache"` + `cacheLife("hours")` + `cacheTag("<entitate>")` (`casinos/games/providers/payments/bonuses/guides/seo`; sitemap tag-at după tabel).
- Mutații: `updateTag("<tag>")` (Next 16). Mapări: casino→casinos+bonuses; bonus→bonuses+casinos; game→games+casinos+providers; provider→providers+games; payment→payments+casinos; guide→guides; SEO→seo+tag entitate.
- **Fără updateTag**: Affiliate Links + Redirects (`/go` și proxy rezolvă live/TTL, nimic cache-uit nu depinde).
- Proxy redirect: cache module-scope TTL 60s (best-effort per instanță/isolate — nu global garantat).

---

## 7. SEO / Structured Data / OG

- **SEO Manager centralizat** (`seo_metadata`): override opțional meta_title/description/canonical(intern)/robots/OG per entitate, cu **fallback** la metadata curentă. `buildMetadata(defaults, seo)` = sursă unică; output identic până la prima valoare custom (robots omis când index+follow). `published_at` (ghiduri) stampilat doar la prima publicare.
- JSON-LD: Organization + WebSite, FAQPage, Review (cazinouri), Article (ghiduri), ItemList. `safeJsonLd` escaping complet.
- `sitemap.ts` dinamic (RLS-aware → doar published), `robots.txt` (dezalow `/go`, `/admin`).

---

## 8. Security hardening & RLS

- Public SELECT doar `status='published'` pe cele 6 entități; lookup-urile `using(true)`; junction-urile public read.
- `affiliate_links`: anon fără acces direct → RPC `get_affiliate_url` (SECURITY DEFINER, filtrează `is_active` + `status='published'`, preferă review_cta).
- Scrieri **admin-only** (`is_admin()` SECURITY DEFINER) pe toate entitățile/junction/seo/redirects. `activity_log` append-only (grant doar select+insert).
- `seo_metadata`/`redirects`: anon read (necesar tehnic), admin write. `redirects`: anon doar active.
- Media Storage: bucket public read; write/list admin-only pe `storage.objects`.
- JSON-LD escaping; related_links ghiduri doar interne; URL afiliat/redirect validat; fără `service_role` în runtime; `.env.local` necomis.

---

## 9. Migrări 0001–0018

| # | Fișier | Descriere |
|---|---|---|
| 0001 | initial_schema | Entități, lookup-uri, junction, affiliate_links, RLS inițial, indexuri, trigger updated_at, view casino↔provider |
| 0002 | order_indexes | Indexuri pentru ORDER BY |
| 0003 | affiliate_links_rpc | `get_affiliate_url` SECURITY DEFINER; revoke anon select |
| 0004 | affiliate_links_revoke_authenticated | Revoke select direct (acces doar prin RPC) |
| 0005 | profiles_admin | `profiles` + `is_admin`, trigger handle_new_user |
| 0006 | casino_write_rls | `is_admin()`; grant/policy admin pe casinos + junction + affiliate |
| 0007 | bonus_write_rls | Admin insert/update bonuses |
| 0008 | game_write_rls | Admin pe games + trigger `game_count` |
| 0009 | provider_write_rls | Admin pe providers |
| 0010 | payment_write_rls | Admin pe payment_methods |
| 0011 | guide_write_rls | Admin pe guides |
| 0012 | casino_archive | `casinos.status` (active/archived) + RLS public=active / admin=tot; RPC status |
| 0013 | affiliate_links_constraints | CHECK placement + https + unique parțial activ + revoke delete |
| 0014 | media_storage | Bucket public `media` + RLS admin-only write/list |
| 0015 | seo_metadata | Tabel SEO centralizat (public read, admin write) |
| 0016 | redirects | Tabel redirects (CHECK intern, anon=active, admin write, no delete) |
| 0017 | activity_log | Audit append-only (admin read, insert-as-self, fără update/delete) |
| 0018 | publishing_model | **ENUM `content_status`**; casinos active→published; status+RLS pe toate 6 (public=published, admin=tot); RPC active→published |

> **Import / Export nu necesită migrare** — operează pe schema + RLS + `activity_log` existente.

Migrările se aplică manual în Supabase SQL Editor (Claude nu rulează DDL). 0007+ sunt idempotente.

---

## 10. Decizii tehnice (Architecture Decisions)

- **`content_status` ENUM comun** (nu text+CHECK per tabelă, nu booleeni/timestamps) — reutilizabil, zero typo-uri, union TS identic.
- **RLS = single source of truth** — o politică per tabelă filtrează automat tot publicul (listinguri, detail, embed-uri, sitemap, sidebar), fără query-uri modificate.
- **slug create-only** (imuabil) — chei stabile pentru redirect/SEO/import.
- **Soft delete prin `archived`** (+ `is_active` la affiliate) — fără pierdere de date, reversibil; `archived` distinct de `draft`.
- **SEO centralizat (`seo_metadata`)** polimorf (entity_type+entity_id) — o singură logică/RLS/UI pentru 6 entități; override→fallback.
- **Media prin Storage + Server Actions** — upload client-resize→WebP, fără client Supabase în browser, fără NEXT_PUBLIC.
- **Redirect Manager în `proxy.ts`** — dinamic (nu `next.config`), cache TTL 60s, graf plat anti-loop/chain.
- **Activity Log append-only, best-effort** — `logActivity` await-uit dar nu aruncă (eșecul nu anulează mutația); metadata `{from,to}`.
- **Import create-only + forced draft** — nu suprascrie, nimic public accidental; FK/M2M prin slug.
- **Dry-run + verificare SHA-256** — importul real respinge dacă conținutul diferă de cel validat.
- **Bulk actions pe listă explicită de ID-uri** (fără paginare în v1 → „select all" = tot setul filtrat); parțial per-rând cu raport.
- **Affiliate `/go` prin RPC SECURITY DEFINER** — anon nu citește tabelul; preferă review_cta; respectă status published.
- **Soft-404 + noindex** pe `[slug]` invalide (cacheComponents blochează hard-404 universal; unele detail ajung totuși la 404 real când readerul e null).
- **`proxy.ts`** (nu `middleware.ts`), **`updateTag`** (nu `revalidateTag`).

---

## 11. Commit-uri importante

**Public→Supabase**: `68b23fd` schema+seed · conectare module (`f99392e`…`6041216`) · `1a4411d` caching · `325fbc4` `/go`.
**SEO/a11y/security**: `d950c08` structured data · `f6a6c2c` OpenGraph · `84be905` a11y · `d9ea174`+`1fac7ae` hardening.
**Admin**: vezi tabelul din §4 (de la `a3fd47a` la `fe7bf68`).
**Docs**: `5c24d6b` (v0) → acest fișier (v1.0).

---

## 12. Lăsate intenționat nefăcute (în afara scope-ului v1)

Login user public · favorite · review-uri/comentarii de la utilizatori · DELETE fizic · automatizare rebuild la slug nou · import JSON · import affiliate links · update-on-import.

---

## 13. Roadmap v2 (evolutiv, nu critic)

AI Content Assistant · AI SEO Suggestions · AI Internal Linking · AI Image Generator · AI FAQ Generator · Analytics Dashboard · Revenue Dashboard · Scheduled Publishing · Version History · Workflow / Approvals · Notifications · API public · Webhooks · Import JSON / affiliate · paginare + „select all matching" la bulk.

---

## 14. Workflow de dezvoltare & comenzi

```bash
npm run dev      # Next dev (Turbopack) → http://localhost:3000
npm run build    # build producție
npm run start    # server producție
npm run lint     # ESLint
npx tsc --noEmit # typecheck
```

**Ritm per modul**: propunere + SQL → aprobare → migrarea pe clipboard (`pbcopy`), aplicată manual de user în SQL Editor → implementare → `build`+`typecheck`+`lint`+runtime → test end-to-end → commit după validare. Verificarea datelor: REST cu `service_role` în scripturi one-off locale (niciodată în runtime).

---

## 15. `.env.local` & secrete

- `.env.local` **necomis** (`.gitignore`: `.env*`).
- Chei: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
- `SUPABASE_SERVICE_ROLE_KEY`: **exclusiv** scripturi locale de verificare/mentenanță — niciodată importat în cod de app (server components / actions / route handlers / proxy). Aplicația = doar cheia anon + sesiunea admin.

---

## 16. Status Lighthouse (audit v1)

SEO **95+** · Performance **95+** · Best Practices **100** · Accessibility **95+**.
(a11y: contrast AA, skip-link, aria-pressed, prefers-reduced-motion, MobileNav dialog+focus-trap, landmark-uri, ordine heading-uri.)
