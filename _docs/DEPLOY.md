# Sprint 1 — Deploy Runbook (Production)

Ordinea de execuție pentru lansarea v1.0. Nu necesită cod funcțional nou.

## 0. Migrări — decizie
Fișierele `supabase/migrations/0001…0018` au prefix `0001`-style (nu timestamp 14-cifre).
**Recomandat: aplică prin Supabase SQL Editor, în ordine 0001 → 0018** (idempotente, testate).
Opțional, verifică dacă CLI le acceptă:
```bash
npx supabase login
npx supabase link --project-ref <PROJECT_REF>
npx supabase db push --dry-run     # listează toate 18 în ordine? → db push e ok; altfel SQL Editor
```
Nu folosi `--include-seed` în producție (seed-ul e pentru dev).

## 1. Supabase Production
1. Creează proiectul prod. Aplică migrările (vezi pasul 0).
2. **Admin**: creează user-ul în Auth → rândul `profiles` se creează automat (trigger 0005) →
   `update public.profiles set is_admin = true where id = '<uuid>';`
3. **Auth → Site URL** = `https://casinonline.ro` (auth-ul e password-based, redirect URLs = low-stakes).
4. **Storage**: confirmă bucket `media` (0014) + politicile admin-only.
5. Activează **PITR / backup** pe planul prod.

## 2. Vercel
1. Conectează repo-ul → proiect nou.
2. **Environment Variables (Production)**:
   - `NEXT_PUBLIC_SITE_URL=https://casinonline.ro`
   - `SUPABASE_URL=<prod>`
   - `SUPABASE_ANON_KEY=<prod>`
   - **NU** pune `SUPABASE_SERVICE_ROLE_KEY` (runtime-ul nu o folosește). Niciun secret în `NEXT_PUBLIC_*`.
3. Deploy pe URL-ul temporar `*.vercel.app`.

## 3. Verificare deploy (temporar, apoi prod)
```bash
./scripts/post-deploy-check.sh https://<app>.vercel.app
```
Așteaptă **PASS** (status codes, /admin protejat, robots, sitemap, canonical, OG, JSON-LD, /go, slug invalid).

## 4. Domeniu
1. Adaugă `casinonline.ro` + `www.casinonline.ro` în Vercel.
2. **www → apex**: redirect permanent din Vercel Domains (NU din Redirect Manager — acela e pentru conținut).
3. **Redeploy** după setarea/schimbarea `NEXT_PUBLIC_SITE_URL` (canonical/OG/sitemap/metadata depind de el).

## 5. Populare conținut
Admin → Import (CSV) → **Dry-run** → Confirmă (intră **draft**) → corectează din Dashboard Health → SEO Manager → **Publish** (sau Bulk „Publică").

## 6. Gate de go-live (înainte de a permite indexarea)
```bash
set -a; . ./.env.local; set +a    # env PROD
node scripts/pre-publish-health.mjs
```
Publică doar dacă: **GO-LIVE READY: YES / Critical issues: 0**.
🔴 blocante: fără intro · cazino fără review_cta activ · joc fără furnizor/categorie · bonus cu cazino non-published. (logo/thumbnail = warning, nu blocant.)

## 7. Search Console + Analytics (DUPĂ publicare)
1. Verifică proprietatea domeniului.
2. Trimite `https://casinonline.ro/sitemap.xml` (abia după publicare — sitemap-ul e RLS-aware: doar `published`).
3. GA4 + (opțional) Microsoft Clarity. Search Console = sursă viitoare pentru Knowledge Engine (v2).

## 8. Audit final pe PRODUCȚIE
```bash
./scripts/post-deploy-check.sh https://casinonline.ro
```
+ Lighthouse pe build-ul de prod (SEO/Perf/BP/A11y), spot-check JSON-LD/OG/mobil/noindex.

---

### Scripturi de suport
- `scripts/post-deploy-check.sh <BASE_URL>` — smoke test rute/SEO/admin, PASS/FAIL (exit 1 la orice eșec).
- `scripts/pre-publish-health.mjs` — gate go-live, 0 🔴 = READY (exit 1 dacă sunt blocante). Rulează cu env PROD; local/admin-only, fără service_role în runtime.
