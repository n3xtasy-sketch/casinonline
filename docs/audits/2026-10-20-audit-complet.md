# Audit complet casinonline.ro — 2026-10-20

Audit exhaustiv, **strict read-only**, pe 7 dimensiuni (frontend, Admin/CMS, Supabase+RLS, funcționalități/redirecturi, relații/integritate, SEO tehnic, design/UX). Nicio modificare de cod, DB, migrații, Vercel sau conținut. Verificările de date s-au făcut cu `service_role` READ-ONLY; **RLS-ul nu a putut fi testat la runtime pentru `anon`** (nu există cheie anon în repo, iar site-ul e privat în spatele Vercel Authentication) — toate afirmațiile despre accesul anonim sunt **deduse din codul migrațiilor**, nu verificate runtime.

## 1. Executive summary

Platforma este **solidă la nivel de fundație**: autentificare admin corectă (toate cele 34 de server-actions trec prin `requireAdmin` = sesiune + `is_admin`), RLS activat pe toate tabelele cu scrieri gate-uite prin `is_admin()`, integritate FK impecabilă (0 orfani), trigger `game_count` corect, import/export cu validare strictă + binding SHA-256, fallback-uri grațioase pentru imagini lipsă, tokeni de design coerenți, a11y de bază (skip-link, focus-visible, reduced-motion).

**Niciun P0** (fără vulnerabilități, pierderi de date sau acces neautorizat). Problemele sunt concentrate în: (a) câteva deviații de stare/conținut care contrazic intenția („DEMO publicat"), (b) corectitudine SEO structurată, (c) hardening defense-in-depth și (d) polish UX/mobil. Majoritatea sunt mici ca efort și fără dependențe între ele.

**Total: 0 × P0 · 3 × P1 · 18 × P2 · 17 × P3** (38 constatări, după dedublare).

### Elemente intenționat incomplete (Sprint 2) — NU sunt buguri
Bonusuri DEMO ca date de test · ghiduri draft · relații casino↔jocuri și casino↔metode de plată nepopulate · imagini/logo-uri lipsă · AI Writer neimplementat · Vercel Authentication activă (intenționat). Acestea apar mai jos doar ca **dependențe de go-live**, nu ca defecte.

---

## 2. Probleme pe severități

### P0 — niciuna
Nu s-a găsit nicio vulnerabilitate de securitate, pierdere de date sau cale de acces neautorizat.

---

### P1 — probleme funcționale / SEO importante

#### P1-1 · Bonusurile DEMO (fictive) sunt `published`, nu `draft`
- **Modul/fișier:** tabel `bonuses` (toate 10 rândurile); model în `0018_publishing_model.sql`, `src/lib/io/entities.ts`
- **Problemă:** Toate cele 10 bonusuri DEMO au `status='published'`, deși intenția declarată (și instrucțiunea de import) era `draft`. Conținutul e explicit fictiv (`offer` începe cu `[DEMO]`, `intro`: „nu reprezintă o ofertă reală").
- **Dovezi:** `bonuses?select=slug,status` → `{"published":10}`; `activity_log` → `bonus.publish` × 10 (n3xtasy@gmail.com, 2026-10-20 12:41). Cazinourile părinte sunt `published`, deci la anon RLS le-ar randa.
- **Impact:** Oferte fictive marcate „nu reprezintă o ofertă reală" ar fi vizibile public la scoaterea Vercel Auth → risc de credibilitate/conformitate ONJN. Momentan mascate de poarta Vercel.
- **Soluție recomandată:** Trecere la `draft` până la înlocuirea cu oferte reale; checklist pre-launch: niciun rând `[DEMO]` să nu fie `published`.
- **Complexitate:** mică

#### P1-2 · Review JSON-LD emite `ratingValue: 0` invalid pe toate paginile de cazinou
- **Modul/fișier:** `src/lib/schema.ts:84-97`, `src/app/(site)/cazinouri-online/[slug]/page.tsx:48-54`, `src/lib/db/casinos.ts:64`
- **Problemă:** `casinoReviewSchema` emite necondiționat `reviewRating.ratingValue`; `toCard` face `rating: row.rating ?? 0`. Toate cele 10 cazinouri publicate au `rating=null` → se emite `ratingValue:0` sub `worstRating:1`.
- **Dovezi:** REST: 10/10 `rating=null`; `casinos.ts:64 rating: row.rating ?? 0`; `schema.ts:90-94 ratingValue: rating … worstRating: 1`.
- **Impact:** Structured data Review invalid pe toate recenziile → Google respinge rich result-ul; implică și „0 stele" editorial fals.
- **Soluție recomandată:** Gardă în cod — emite blocul Review doar când `rating>0`; apoi populează `casinos.rating`.
- **Complexitate:** mică

#### P1-3 · Câmpul de căutare din header este inert (nu caută nimic)
- **Modul/fișier:** `src/components/ui/SearchInput.tsx:8-23` (în `src/components/layout/Header.tsx:15`)
- **Problemă:** `<input type="search">` fără `onChange`/`onSubmit`/form/navigare. Cel mai proeminent control (pe fiecare pagină) pare funcțional dar e mort (comentariu: „Real search … Phase 8").
- **Dovezi:** niciun handler în fișier; `Header.tsx:15` îl randează `max-w-[480px]`.
- **Impact:** Utilizatorii vor încerca să caute și vor percepe site-ul ca stricat. Nu e pe lista intenționat-incomplet aprobată.
- **Soluție recomandată:** Cablare la `/cautare?q=` (filtru simplu peste `getCasinos/getGames`), SAU ascundere/`disabled` cu „Căutare — în curând" până la Phase 8.
- **Complexitate:** medie

---

### P2 — UX / performanță / mentenanță / consistență

#### P2-1 · Scrierile în joncțiuni înghit erorile → salvări parțiale raportate ca succes
- **Modul/fișier:** `cazinouri/actions.ts:81-110` (`syncJunction`, `upsertAffiliate`), `jocuri/actions.ts:85-91`, `metode-de-plata/actions.ts:119,140`
- **Problemă:** Helperele M2M fac `delete`+`insert` fără a captura `{error}`; acțiunea loghează succes și face `redirect()` indiferent. `delete`-apoi-`insert` e non-tranzacțional.
- **Dovezi:** `cazinouri/actions.ts:88,91` fără `const {error}`; contrast cu importul care surfacează erorile (`io.ts:128`).
- **Impact:** Dacă un insert în joncțiune eșuează, entitatea principală se salvează dar relațiile (tag-uri/metode/jocuri/CTA afiliat) dispar silențios; un insert eșuat după delete șterge relațiile existente.
- **Soluție recomandată:** Capturează `{error}`, propagă în `FormState`, nu face redirect; ideal op atomică (RPC/tranzacție).
- **Complexitate:** medie

#### P2-2 · Fonturile Geist nu includ `latin-ext` — diacriticele ă/ș/ț cad pe fontul de rezervă
- **Modul/fișier:** `src/app/layout.tsx:8,13`
- **Problemă:** `Geist({subsets:["latin"]})` (și Mono) nu încarcă glifele `latin-ext` (ă U+0103, ș U+0219, ț U+021B) → browserul le randează din fallback (Inter/system-ui).
- **Dovezi:** `subsets:["latin"]` ambele; `--font-sans` cu fallback Inter.
- **Impact:** Pe un site integral în română, amestec vizibil de forme de literă în interiorul cuvintelor pe tot site-ul.
- **Soluție recomandată:** `subsets:["latin","latin-ext"]`.
- **Complexitate:** mică

#### P2-3 · `seo_metadata` cu `select using(true)` ar expune public metadatele entităților draft/archived (+ fără FK)
- **Modul/fișier:** `0015_seo_metadata.sql:27-28` (policy), `:8-9` (lipsă FK pe `entity_id`)
- **Problemă:** SELECT public `using(true)` pe toate rândurile, inclusiv pentru entități draft/archived (ascunse de RLS pe tabelele principale). `entity_id` polimorf fără FK → orfani la ștergere.
- **Dovezi:** `create policy "seo read" … using (true)`; tabel gol acum (0 rânduri → fără impact live încă). [dedus din cod]
- **Impact:** Dezvăluie editorial nepublicat (meta_title/description/canonical/og_image) înainte de lansare; orfani reintroduc metadate.
- **Soluție recomandată:** Restrânge citirea la `is_admin()` sau filtrează pe statusul entității; cleanup orfani.
- **Complexitate:** medie

#### P2-4 · Taxonomiile nu au politici/granturi de scriere admin (inconsistent cu restul)
- **Modul/fișier:** `0001_initial_schema.sql:285-306` (+ niciun migration ulterior)
- **Problemă:** `bonus_types/game_categories/payment_types/guide_categories/tags` au doar SELECT public; fără politici `is_admin()` de insert/update/delete → modificabile EXCLUSIV cu service_role (bypass RLS).
- **Dovezi:** doar `… read using (true)`; `grant` fără insert/update; 0006-0020 nu le ating. [dedus din cod]
- **Impact:** Managementul taxonomiilor din Admin nu merge pe calea admin normală; forțează service_role sau editare manuală.
- **Soluție recomandată:** Politici `admin insert/update/delete` cu `is_admin()` + granturi; sau documentează „doar seed via import".
- **Complexitate:** mică

#### P2-5 · Protecția anti-lanț/buclă la redirecturi e ocolită când `to_path` nu e unic
- **Modul/fișier:** `src/app/admin/(panel)/redirects/actions.ts:72-76` (`chainConflict`, `q2.maybeSingle()`)
- **Problemă:** `q2` folosește `.maybeSingle()` și citește doar `.data`, ignorând `.error`. `to_path` nu e unic (doar `from_path`). La ≥2 redirecturi active cu același `to_path` = noul `from`, `.maybeSingle()` dă eroare + `data=null` → conflictul de lanț nu e detectat.
- **Dovezi:** `if ((await q2.maybeSingle()).data)`; `0016` definește unique doar pe `from_path`. (0 rânduri acum → latent.)
- **Impact:** Garanția de „graf plat" pică → se pot crea lanțuri `A→from→to`; browserul urmează lanțul.
- **Soluție recomandată:** `.limit(1)` pe array / tratează `error`; orice rând (inclusiv >1) = conflict.
- **Complexitate:** mică

#### P2-6 · Publicarea cazinoului nu e blocată de lipsa unui `review_cta` activ (gate doar informativ)
- **Modul/fișier:** `cazinouri/actions.ts:153`, `cazinouri/bulk-actions.ts:30-44`; regula e doar raport în `admin-dashboard.ts:218-227`
- **Problemă:** Fluxul de status (`applyStatusChange`, bulk `setStatus`) nu verifică existența unui link afiliat înainte de `published`; „gate"-ul există doar ca regulă de dashboard (severity high).
- **Dovezi:** `applyStatusChange` face doar `update({status})`; `affiliate_links` = 0 → toate cele 10 cazinouri live fără `review_cta`.
- **Impact:** Toate `/go` live cad pe fallback on-site (fără monetizare); dependența de go-live nu e impusă tehnic.
- **Soluție recomandată:** Verificare la `next==="published"` pentru existența unui `affiliate_links` activ `review_cta`, cu blocare; sau documentează ca dependență de go-live.
- **Complexitate:** mică

#### P2-7 · GameCard: RTP/volatilitate + CTA sunt doar pe hover — invizibile pe touch/mobil *(dedus din cod)*
- **Modul/fișier:** `src/components/games/GameCard.tsx:40`
- **Problemă:** Overlay `opacity-0 group-hover:opacity-100 focus-within:opacity-100`; pe touch nu există hover/focus-within → RTP/volatilitate și „Vezi jocul" nu apar niciodată. Grila e `grid-cols-2` pe mobil (trafic mare).
- **Dovezi:** `GameCard.tsx:40`; nicio regulă `@media(hover:none)` în globals.css. (RTP apare totuși pe pagina de detaliu.)
- **Impact:** Paritate mobil degradată: informație + CTA ascunse pe segmentul principal de trafic.
- **Soluție recomandată:** Afișează RTP/vol + CTA permanent pe viewport mici (`@media(hover:none)` / variantă Tailwind) sau fă thumbnail-ul link.
- **Complexitate:** mică

#### P2-8 · `GameDetailHeader`: `sizes="256px"` dar imaginea e `w-full` pe mobil → sub-rezoluție
- **Modul/fișier:** `src/components/games/GameDetailHeader.tsx:18,20`
- **Problemă:** Container `aspect-[4/3] w-full md:w-64` dar `<Image fill sizes="256px">` fix → next/image servește ~256px și când containerul e full-width pe mobil.
- **Dovezi:** linii 18/20; GuideCard/GuideArticleHeader folosesc corect `(max-width:768px) 100vw, …`.
- **Impact:** Imaginea hero a jocului apare blurată pe telefon.
- **Soluție recomandată:** `sizes="(max-width: 768px) 100vw, 256px"`.
- **Complexitate:** mică

#### P2-9 · Lipsesc `loading.tsx` și `error.tsx` la nivel de rută; `<main>` nu e în Suspense
- **Modul/fișier:** `src/app/(site)/**` (niciun loading/error), `src/components/layout/AppShell.tsx:27`
- **Problemă:** Toate paginile sunt DB-backed (`instant=false`) dar fără `loading.tsx` (fără skeleton la navigare) și fără `error.tsx` (erorile de query ajung la eroarea globală). Doar RightSidebar are Suspense/skeleton.
- **Dovezi:** `find … loading.tsx/error.tsx` → gol; `AppShell:27 <main>{children}</main>` fără Suspense.
- **Impact:** Navigare fără feedback + reziliență slabă la erori de query; inconsistent cu sidebar-ul.
- **Soluție recomandată:** `loading.tsx` (skeleton în stil `SidebarFallback`) + `error.tsx` per grup `(site)`.
- **Complexitate:** medie

#### P2-10 · `FactsGrid` trunchiază valorile fără `title`/tooltip → valori lungi inaccesibile
- **Modul/fișier:** `src/components/ui/FactsGrid.tsx:27`
- **Problemă:** `truncate` fără `title`; valori lungi (Interval pariu, Timp retragere, Licență, Limită maximă) tăiate fără cale de a vedea textul complet. Folosit de CasinoFacts/GameSpecs/BonusFacts/PaymentFacts/ProviderFacts.
- **Dovezi:** `<p className="truncate …">{value}</p>`.
- **Impact:** Pierdere de informație factuală, mai ales în coloana îngustă pe mobil.
- **Soluție recomandată:** `title={value}` sau wrap pe liniile de valoare.
- **Complexitate:** mică

#### P2-11 · Butonul „Favorite" din header este inert
- **Modul/fișier:** `src/components/layout/Header.tsx:18-20`
- **Problemă:** `<IconButton label="Favorite">` fără `onClick`/`href`; nicio pagină `/favorite`. (`FavoriteButton` de pe carduri ține starea doar local.)
- **Dovezi:** Header nu pasează handler; `IconButton` e `<button type=button>` fără acțiune.
- **Impact:** Buton vizibil care nu face nimic; inconsistent cu hover-ul acționabil.
- **Soluție recomandată:** Ascunde până la Phase 10 sau leagă la o pagină/drawer; minim tooltip „În curând".
- **Complexitate:** mică

#### P2-12 · Pagina „Furnizori" nu are empty-state (grilă goală)
- **Modul/fișier:** `src/app/(site)/furnizori/page.tsx:74-78`
- **Problemă:** Mapează `providers.map(...)` fără guard pe `.length`, spre deosebire de celelalte 5 listări care au bloc „Nu am găsit…".
- **Dovezi:** `grep "Nu am"` → prezent pe celelalte, absent la furnizori.
- **Impact:** Inconsistență + stare goală neîngrijită.
- **Soluție recomandată:** Adaugă același empty-state.
- **Complexitate:** mică

#### P2-13 · Heading-uri de secțiune randate peste date goale („Cazinouri similare", secțiuni home)
- **Modul/fișier:** `cazinouri-online/[slug]/page.tsx:107-117`; `src/app/(site)/page.tsx`
- **Problemă:** Secțiunea „Cazinouri similare" randează mereu `SectionHeader`+container apoi `related.map`; la 0 rezultate rămâne titlu orfan. (Secțiunile „Metode"/„FAQ" din aceeași pagină sunt corect gard-ate cu `?.length`.)
- **Dovezi:** `:107-117` fără guard vs `:75,:100` cu guard.
- **Impact:** Titluri orfane în stările cu date puține (frecvente în populare).
- **Soluție recomandată:** `related.length ? (...) : null`.
- **Complexitate:** mică

#### P2-14 · Cod mort: array-urile mock din `src/data/*.ts` + modulele `*-details.ts`
- **Modul/fișier:** `src/data/{casinos,games,bonuses,providers,payments,guides}.ts` (array-uri conținut + slice-uri) și `src/data/*-details.ts`
- **Problemă:** Paginile live citesc exclusiv din `src/lib/db/*`. Array-urile mock, slice-urile și getter-ele `get*Detail` nu sunt importate nicăieri (doar filtrele/sortările/`homeFaq`/`sidebarGroups`/`gameCategoryFilters` sunt folosite).
- **Dovezi:** `grep` importuri din `@/data/*` confirmă doar configurări; `get*Detail` nu apare în afara `src/data/`.
- **Impact:** Risc de divergență mock↔DB, confuzie „sursa de adevăr", cod livrat inutil.
- **Soluție recomandată:** Șterge array-urile de conținut + cele 6 `*-details.ts`; păstrează doar configurările folosite.
- **Complexitate:** mică

#### P2-15 · `SearchInput` nu folosește tokenii de câmp din design-system
- **Modul/fișier:** `src/components/ui/SearchInput.tsx:20` vs `src/components/ui/Input.tsx:26`
- **Problemă:** `SearchInput` folosește `bg-surface border-border-strong rounded-md`; `Input` folosește `bg-field border-field-border rounded-sm` (tokenii din DESIGN.md).
- **Dovezi:** liniile citate.
- **Impact:** Două tratamente vizuale pentru inputuri; abatere de la design-system.
- **Soluție recomandată:** Aliniază la `bg-field/border-field-border/rounded-sm`.
- **Complexitate:** mică

#### P2-16 · OG/thumbnail cad pe o singură imagine statică pe tot site-ul *(dependență imagini)*
- **Modul/fișier:** `src/lib/seo.ts:26,88` + `seo_metadata` gol + `logo_url` null
- **Problemă:** `ogImage = seo?.og_image || "/opengraph-image"`; fără imagini per-entitate, fiecare pagină servește aceeași imagine OG.
- **Dovezi:** `seo_metadata` 0 rânduri; 10/10 cazinouri `logo=null`.
- **Impact:** Share-uri social/thumbnail-uri identice pe toate paginile. (Consecință a lipsei imaginilor — intenționat incomplet.)
- **Soluție recomandată:** Populează `og_image`/`logo_url`; opțional `opengraph-image.tsx` dinamic per `[slug]`.
- **Complexitate:** medie

#### P2-17 · Hub-ul `/ghiduri` e în sitemap și indexabil deși are 0 ghiduri publicate *(legat de go-live)*
- **Modul/fișier:** `src/app/sitemap.ts:42-47`, `src/app/(site)/ghiduri/page.tsx`
- **Problemă:** Cele 7 hub-uri intră necondiționat în sitemap (prio 0.8); `/ghiduri` are 5 ghiduri `draft` → listează 0 dar rămâne în sitemap.
- **Dovezi:** `guides {"draft":5}`; `sitemap.ts:42-47` fără verificare copii publicați.
- **Impact:** Thin content în sitemap → crawl irosit/semnal de calitate.
- **Soluție recomandată:** Publică ghiduri la lansare; opțional exclude hub-urile fără copii publicați.
- **Complexitate:** mică

#### P2-18 · Rând de test rămas în prod: „Test Casino Production"
- **Modul/fișier:** tabel `casinos`, slug `test-casino-production`
- **Problemă:** Cazino de test în prod (`archived`, `intro=null`, `rating=1.5/editor_score=2.3` fictive — singurul cu rating). Ascuns public, dar poluează admin/export/numărători.
- **Dovezi:** REST row; 0 bonusuri atașate (fără orfani).
- **Impact:** Date de test în prod; confuzie la rapoarte (11 cazinouri din care 1 fals).
- **Soluție recomandată:** Curățare după confirmare că nu e referit.
- **Complexitate:** mică

---

### P3 — îmbunătățiri opționale / hardening

| ID | Constatare | Modul/fișier | Dovezi | Impact | Soluție | Complex. |
|---|---|---|---|---|---|---|
| P3-1 | Tranzițiile de status nu sunt validate server-side | `content-status.ts:26-51` + callers `set*Status` | `applyStatusChange` folosește `opts.next` verbatim; `availableTransitions` doar în `ContentStatusControl.tsx` | Admin poate face tranziții nepermise prin POST direct (integritate flux, nu privilegiu) | Verifică `availableTransitions(from)` + enum în `applyStatusChange` | mică |
| P3-2 | Proxy `/admin` verifică doar sesiunea, nu `is_admin` | `src/proxy.ts:49-57` | `if (… && !user)`, fără lookup `is_admin` | Latent — layout + toate acțiunile re-verifică `is_admin` (34/34), dar orice acțiune viitoare fără `requireAdmin` ar fi expusă unei sesiuni non-admin | Adaugă `is_admin` în proxy / confirmă că signup Supabase e dezactivat | mică |
| P3-3 | Fără validare de interval numeric (rating/score/rtp/an) | `cazinouri/actions.ts:35-40`, `jocuri/actions.ts`, `io/validate.ts:89-94` | `num` verifică doar `Number.isFinite` | Valori în afara intervalului (negative/absurde) persistă → UI stricat | min/max per `FieldDef` + în form actions | mică |
| P3-4 | `deleteMedia` fără allowlist de folder; check dimensiune import pe UTF-16 | `media/actions.ts:67-78`; `import/actions.ts:38` | `storage.remove([path])` fără `isMediaFolder`; `csvText.length` ≠ bytes | Admin poate șterge orice obiect din bucket; fișier multibyte poate depăși 2MB | allowlist folder în delete; `Buffer.byteLength(…, "utf8")` | mică |
| P3-5 | Joncțiunile sunt citibile public `using(true)` | `0001:313-315` | policy `casino_games/… read using(true)` | Scurgere de existență (UUID-uri) a entităților nepublicate; junctions goale acum | Restrânge la perechi `published` (exists) sau acceptă explicit | medie |
| P3-6 | `providers.game_count` include jocuri draft/archived | `0008:20-35` | funcția nu filtrează `status`; sumele corecte acum (toate published) | Numere inflate pe paginile de provider când apar drafturi | `… and status='published'` în trigger | mică |
| P3-7 | `get_affiliate_url` nedeterminist la mai multe campanii `review_cta` active *(dedus — raportat de 2 dimensiuni)* | `0018` RPC; index `0013:19-21` | `order by (placement='review_cta') limit 1` fără tiebreak; unique permite `campaign` multiple | `/go` poate alege campania greșită | tiebreak `campaign is null`/`updated_at desc`/`id` | mică |
| P3-8 | SECURITY DEFINER cu `search_path=public` (hardening) | `0003/0005/0006/0008/0012/0018` | obiecte deja calificate `public.*`; `public` scriibil în default PG | Foarte scăzut (anon/authenticated fără CREATE pe public) | `set search_path=''` + nume calificate | mică |
| P3-9 | Iframe demo: `sandbox="allow-scripts allow-same-origin"` | `GameDemoPlayer.tsx:34` | combinație semnalată de scanere; conținut cross-origin (fără evadare) + allowlist gol | Minim (cross-origin); terțul capătă propriul storage | La activare, testează fără `allow-same-origin` | mică |
| P3-10 | Cache redirecturi (TTL 60s) fără invalidare la Admin | `src/lib/redirects-cache.ts:16-70` | `TTL_MS=60_000`; `updateTag` nu atinge proxy-ul | Un redirect greșit dezactivat propagă în ≤60s/instanță (documentat/asumat) | Acceptabil; opțional endpoint de purge sau TTL mai mic | mică |
| P3-11 | `/go/<slug>` pentru cazino nepublicat/inexistent → 302 spre soft-404 | `src/app/go/[slug]/route.ts:14-19` | fallback `redirect("/cazinouri-online/<slug>")`; RLS ascunde nepublicatele | Minor; `/go` disallow în robots; fără buclă | Verifică existența cazinoului publicat înainte de redirect, altfel hub | mică |
| P3-12 | Fără `.eq('status','published')` în cod — depinde exclusiv de RLS | `slugs.ts:15`, `casinos.ts:104,133`, `guides.ts:75,101`, `seo.ts:23` | nicio interogare publică nu filtrează; corect acum via RLS | Fără defense-in-depth: o regresie pe service_role ar scurge drafturi | Adaugă `.eq('status','published')` defensiv | mică |
| P3-13 | `sitemap lastModified` = un singur timestamp global pe toate hub-urile | `sitemap.ts:36-47` | `latest` = max global aplicat identic | Semnal `lastmod` imprecis per secțiune | `lastmod` per hub din entitatea corespunzătoare | mică |
| P3-14 | `getSeoForSlug` face 2 round-trip-uri DB inutile (seo_metadata gol) | `src/lib/db/seo.ts:18-45` | `entityIdBySlug` + `getSeoById`→null; `seo_metadata` 0 rânduri | Overhead minor (ambele `use cache`) | Se rezolvă natural la popularea override-urilor | mică |
| P3-15 | Valori ad-hoc în loc de tokeni (shell width, umbre, raze) | `Footer.tsx:34`, `GameDemoPlayer.tsx:46`, `Dropdown.tsx:80` | `max-w-[1600px]`, `shadow-lg`, `rounded-[7px]` | Abateri de la single-source-of-truth | `var(--shell-max)`, token de umbră, `rounded-xs` | mică |
| P3-16 | Primitive nefolosite (Modal, Tooltip) | `ui/Modal.tsx`, `ui/Tooltip.tsx` | `grep` → 0 importuri în afara fișierelor proprii | Suprafață de cod nefolosit | Păstrează dacă planificate; altfel elimină | mică |
| P3-17 | `Dropdown role="menu"` fără navigare cu săgeți/focus la deschidere | `ui/Dropdown.tsx:53,73-88` | doar `mousedown`+`Escape`; fără Arrow handling/focus init | Semantică ARIA care promite comportament neimplementat | Implementează săgeți+focus sau renunță la rolurile menu | medie |

---

## 3. Securitate și integritate

**Puncte forte (verificate):** toate cele 34 de server-actions trec prin `requireAdmin` (sesiune + `is_admin`); RLS activat pe toate tabelele; scrieri gate-uite `with check (is_admin())`; `is_admin()` SECURITY DEFINER cu `search_path` setat, fără recursie RLS; `profiles` fără insert/update policy (fără auto-escaladare; `handle_new_user` forțează `is_admin=false`); `affiliate_links` accesibil doar prin RPC; bucket `media` public-read/admin-write; `activity_log` append-only; constrângeri CHECK corecte; FK on-delete coerente; **0 orfani**; import cu whitelist entități + caps + validare JSON strictă + binding SHA-256 + create-only + draft.

**De remediat (hardening):** P2-3 (seo_metadata public read draft), P2-4 (taxonomii fără write admin), P3-2 (proxy is_admin), P3-5 (junctions public read), P3-8 (search_path), P3-4 (deleteMedia allowlist). **Important:** RLS/anon **nu a fost testat runtime** — de validat cu un test anon real (cheie anon) înainte de go-live.

## 4. Funcționalități lipsă sau incomplete
- Căutare (P1-3) — Phase 8, momentan inertă.
- Favorite (P2-11) — persistența vine cu auth.
- Monetizare: `affiliate_links` gol → `/go` pe fallback on-site (P2-6); dependență de go-live.
- Imagini/logo-uri lipsă peste tot (intenționat Sprint 2) → impact OG/thumbnail (P2-16).
- `rating`/`editor_score` null pe cazinourile reale → sortare + Review JSON-LD afectate (P1-2).
- Relații casino↔jocuri/metode goale (intenționat) → pagini de provider fără cazinouri, carduri fără relații.
- AI Writer — neimplementat (planificat v2); infra `jsonFields` pregătită.

## 5. Observații SEO
P1-2 (Review ratingValue:0) e cea mai urgentă. Apoi: hub `/ghiduri` thin în sitemap (P2-17), OG static (P2-16), lipsă `.eq published` defensiv (P3-12), `lastmod` global (P3-13). **Go-live:** întregul site e noindex-prin-inaccesibilitate cât timp Vercel Auth e activ (intenționat) — de verificat sitemap/robots/canonical + `NEXT_PUBLIC_SITE_URL` la dezactivarea protecției. JSON-LD (breadcrumb/FAQ/Article/Organization/Website) + canonical non-www + soft-404 noindex = corecte.

## 6. Observații UX/design
Fundație de design solidă (tokeni, a11y de bază, fallback-uri imagini). Probleme: căutare inertă (P1-3), paritate mobil GameCard (P2-7), fără skeletoane/erori (P2-9), diacritice font (P2-2), truncare fără tooltip (P2-10), empty-states inconsistente (P2-12/13), Favorite inert (P2-11), cod mock mort (P2-14), inconsistențe tokeni (P2-15, P3-15).

---

## 7. Roadmap de remediere (în ordinea dependințelor)

**Faza A — corecturi rapide de corectitudine (fără dependențe, efort mic):**
1. P1-2 gardă Review `rating>0` + P2-2 font `latin-ext` + P2-1 erori joncțiuni + P2-5 redirect `maybeSingle` + P1-1 bonusuri DEMO → draft.

**Faza B — populare date (continuare Sprint 2, deblochează restul):**
2. Relații casino↔jocuri/metode; `rating`/`editor_score`; imagini/logo-uri (Media Library); `affiliate_links` (`review_cta`) → apoi activează P2-6 (gate publicare) și rezolvă P2-16 (OG).

**Faza C — SEO pre-launch:**
3. P2-17 (sitemap hub-uri cu copii publicați), P3-12 (`.eq published` defensiv), P2-3 (seo_metadata RLS), P3-13 (`lastmod` per hub).

**Faza D — UX/mobil:**
4. P2-7 (GameCard mobil), P2-9 (loading/error), P2-10 (FactsGrid title), P2-8 (sizes), P2-12/13 (empty-states), P1-3 (căutare — Phase 8), P2-11 (Favorite).

**Faza E — hardening + curățenie (P3):**
5. P3-1/2/3/4 (admin), P2-4/P3-5/6/8 (DB policies/trigger), P3-7 (get_affiliate_url), P3-10/11 (redirect/go), P2-14/P3-15/16/17 (cod mort/tokeni/a11y), P2-18 (șterge test casino).

## 8. Checklist pentru lansarea publică
- [ ] Înlocuiește bonusurile DEMO cu oferte reale **sau** trece-le pe `draft` (niciun `[DEMO]` published).
- [ ] Publică ghidurile (după review editorial).
- [ ] Populează `rating`/`editor_score`, imagini/logo-uri, relații casino↔jocuri/metode.
- [ ] Adaugă `affiliate_links` reale (`review_cta`) pentru fiecare cazino + activează gate-ul de publicare.
- [ ] Rezolvă P1-2 (Review JSON-LD) — obligatoriu pentru rich results.
- [ ] Șterge `test-casino-production`.
- [ ] Rulează `scripts/pre-publish-health.mjs` → `GO-LIVE READY: YES / 0 critical`.
- [ ] Verifică `NEXT_PUBLIC_SITE_URL` (non-www, https) în Vercel; redeploy.
- [ ] **Dezactivează Vercel Authentication**; verifică imediat robots/sitemap/canonical + un test **anon real** pe RLS (draft invizibil).
- [ ] Trimite sitemap în Search Console; verifică indexarea + rich results.

---
*Audit read-only. Nicio modificare de cod/DB/migrații/Vercel/conținut. RLS dedus din cod (netestat anon runtime). Date verificate via service_role READ-ONLY, 2026-10-20.*
