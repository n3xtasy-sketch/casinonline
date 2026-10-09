/**
 * Programmatic seed — inserts the existing mock data (src/data/*) into Supabase
 * using the SERVICE ROLE key (server-side only, read from .env.local).
 *
 * Run:  node --env-file=.env.local --import tsx scripts/seed.ts
 */
import { createClient } from "@supabase/supabase-js";

import { allProviders } from "../src/data/providers";
import { getProviderDetail } from "../src/data/provider-details";
import { allGames, gameCategoryFilters } from "../src/data/games";
import { getGameDetail } from "../src/data/game-details";
import { allCasinos, casinoFilterTags } from "../src/data/casinos";
import { getCasinoDetail } from "../src/data/casino-details";
import { allPaymentMethods, paymentTypeFilters } from "../src/data/payments";
import { getPaymentMethodDetail } from "../src/data/payment-details";
import { allGuides, guideCategoryFilters } from "../src/data/guides";
import { getGuideDetail } from "../src/data/guide-details";
import { allBonuses, bonusTypeFilters } from "../src/data/bonuses";
import { getBonusDetail } from "../src/data/bonus-details";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const db = createClient(url, key, { auth: { persistSession: false } });

type Row = Record<string, unknown>;

async function insertMap(table: string, rows: Row[]) {
  const { data, error } = await db.from(table).insert(rows).select("id, slug");
  if (error) throw new Error(`${table}: ${error.message}`);
  const out = (data ?? []) as unknown as Array<{ id: string; slug: string }>;
  const map = new Map<string, string>();
  for (const r of out) map.set(r.slug, r.id);
  console.log(`  ${table.padEnd(24)} ${map.size}`);
  return map;
}

async function insert(table: string, rows: Row[]) {
  if (!rows.length) {
    console.log(`  ${table.padEnd(24)} 0`);
    return;
  }
  const { error } = await db.from(table).insert(rows);
  if (error) throw new Error(`${table}: ${error.message}`);
  console.log(`  ${table.padEnd(24)} ${rows.length}`);
}

/** De-duplicate join rows by their composite key. */
function dedupe(rows: Row[], keys: string[]): Row[] {
  const seen = new Set<string>();
  const out: Row[] = [];
  for (const r of rows) {
    const k = keys.map((kk) => r[kk]).join("|");
    if (!seen.has(k)) {
      seen.add(k);
      out.push(r);
    }
  }
  return out;
}

/** Delete all rows (child → parent order) so the seed is idempotent. */
async function clearAll() {
  const order = [
    "affiliate_links",
    "casino_games",
    "casino_payment_methods",
    "casino_tags",
    "bonuses",
    "guides",
    "payment_methods",
    "casinos",
    "games",
    "providers",
    "tags",
    "guide_categories",
    "payment_types",
    "game_categories",
    "bonus_types",
  ];
  for (const t of order) {
    const col =
      t === "casino_games" || t === "casino_payment_methods" || t === "casino_tags"
        ? "casino_id"
        : "id";
    const { error } = await db.from(t).delete().not(col, "is", null);
    if (error) throw new Error(`clear ${t}: ${error.message}`);
  }
  console.log("  cleared all tables");
}

async function main() {
  console.log("Seeding (table → rows):");
  await clearAll();

  // 1. Taxonomies
  const bonusTypeMap = await insertMap(
    "bonus_types",
    bonusTypeFilters.map((t, i) => ({ slug: t.value, label: t.label, sort_order: i })),
  );
  const gameCatMap = await insertMap(
    "game_categories",
    gameCategoryFilters.map((t, i) => ({ slug: t.value, label: t.label, sort_order: i })),
  );
  const payTypeMap = await insertMap(
    "payment_types",
    paymentTypeFilters.map((t, i) => ({ slug: t.value, label: t.label, sort_order: i })),
  );
  const guideCatMap = await insertMap(
    "guide_categories",
    guideCategoryFilters.map((t, i) => ({ slug: t.value, label: t.label, sort_order: i })),
  );
  const tagMap = await insertMap(
    "tags",
    casinoFilterTags.map((t, i) => ({ slug: t.value, label: t.label, sort_order: i })),
  );

  // 2. Providers
  const providerMap = await insertMap(
    "providers",
    allProviders.map((p) => {
      const d = getProviderDetail(p.slug)!;
      return {
        slug: p.slug,
        name: p.name,
        logo_url: p.logoUrl ?? null,
        game_count: p.gameCount,
        category: p.category ?? null,
        founded: d.founded ? Number.parseInt(d.founded, 10) : null,
        country: d.country ?? null,
        specialty: d.specialty ?? null,
        rtp_range: d.rtpRange ?? null,
        intro: d.intro,
        faq: d.faq ?? [],
      };
    }),
  );

  // 3. Games
  const gameMap = await insertMap(
    "games",
    allGames.map((g) => {
      const d = getGameDetail(g.slug)!;
      return {
        slug: g.slug,
        name: g.name,
        provider_id: providerMap.get(g.providerSlug) ?? null,
        category_id: gameCatMap.get(g.categorySlug) ?? null,
        thumbnail_url: g.thumbnailUrl ?? null,
        rtp: g.rtp ?? null,
        volatility: g.volatility ?? null,
        intro: d.intro,
        max_win: d.maxWin ?? null,
        release_year: d.releaseDate ? Number.parseInt(d.releaseDate, 10) : null,
        reels: d.reels ?? null,
        paylines: d.paylines ?? null,
        bet_range: d.betRange ?? null,
        mechanics: d.mechanics,
        bonus_features: d.bonusFeatures ?? [],
        faq: d.faq ?? [],
      };
    }),
  );

  // 4. Casinos
  const casinoMap = await insertMap(
    "casinos",
    allCasinos.map((c) => {
      const d = getCasinoDetail(c.slug)!;
      return {
        slug: c.slug,
        name: c.name,
        logo_url: c.logoUrl ?? null,
        rating: c.rating ?? null,
        editor_score: d.editorScore ?? null,
        license: c.license ?? null,
        payout_speed: c.payoutSpeed ?? null,
        withdrawal_time: d.withdrawalTime ?? null,
        verified_at: null,
        min_deposit: d.minDeposit ?? null,
        kyc: d.kyc ?? null,
        support: d.support ?? null,
        mobile: d.mobile ?? null,
        offer_url: c.offerUrl ?? null,
        intro: d.intro,
        editor_review: d.editorReview,
        pros: d.pros,
        cons: d.cons,
        faq: d.faq ?? [],
      };
    }),
  );

  // 5. Payment methods
  const payMap = await insertMap(
    "payment_methods",
    allPaymentMethods.map((m) => {
      const d = getPaymentMethodDetail(m.slug)!;
      return {
        slug: m.slug,
        name: m.name,
        logo_url: m.logoUrl ?? null,
        payment_type_id: payTypeMap.get(m.typeSlug) ?? null,
        intro: d.intro,
        deposits: d.deposits,
        withdrawals: d.withdrawals,
        deposit_speed: d.depositSpeed ?? null,
        withdrawal_speed: d.withdrawalSpeed ?? null,
        fees: d.fees ?? null,
        min_limit: d.minLimit ?? null,
        max_limit: d.maxLimit ?? null,
        pros: d.pros,
        cons: d.cons,
        faq: d.faq ?? [],
      };
    }),
  );

  // 6. Guides
  await insert(
    "guides",
    allGuides.map((g) => {
      const d = getGuideDetail(g.slug)!;
      return {
        slug: g.slug,
        title: g.title,
        category_id: guideCatMap.get(g.categorySlug) ?? null,
        excerpt: g.excerpt,
        image_url: g.imageUrl ?? null,
        author: g.author,
        intro: d.intro,
        reading_time: d.readingTime ?? null,
        sections: d.sections,
        related_links: d.relatedLinks,
        faq: d.faq ?? [],
        published_at: null,
      };
    }),
  );

  // 7. Bonuses
  await insert(
    "bonuses",
    allBonuses.map((b) => {
      const d = getBonusDetail(b.slug)!;
      return {
        slug: b.slug,
        casino_id: casinoMap.get(b.casinoSlug),
        bonus_type_id: bonusTypeMap.get(b.typeSlug) ?? null,
        offer: b.offer,
        free_spins: b.freeSpins ?? null,
        wagering: b.wagering ?? null,
        code: b.code ?? null,
        claim_url: b.claimUrl ?? null,
        intro: d.intro,
        min_deposit: d.minDeposit ?? null,
        validity: d.validity ?? null,
        terms: d.terms,
        pros: d.pros,
        cons: d.cons,
        how_to_claim: d.howToClaim,
        faq: d.faq ?? [],
      };
    }),
  );

  // 8. casino_tags
  const casinoTags: Row[] = [];
  for (const c of allCasinos) {
    for (const t of c.tags ?? []) {
      const casino_id = casinoMap.get(c.slug);
      const tag_id = tagMap.get(t);
      if (casino_id && tag_id) casinoTags.push({ casino_id, tag_id });
    }
  }
  await insert("casino_tags", dedupe(casinoTags, ["casino_id", "tag_id"]));

  // 9. casino_payment_methods (match by display name)
  const payByName = new Map(allPaymentMethods.map((m) => [m.name, m.slug]));
  const casinoPM: Row[] = [];
  for (const c of allCasinos) {
    const d = getCasinoDetail(c.slug)!;
    for (const name of d.paymentMethods ?? []) {
      const slug = payByName.get(name);
      const payment_method_id = slug ? payMap.get(slug) : undefined;
      const casino_id = casinoMap.get(c.slug);
      if (casino_id && payment_method_id) casinoPM.push({ casino_id, payment_method_id });
    }
  }
  await insert("casino_payment_methods", dedupe(casinoPM, ["casino_id", "payment_method_id"]));

  // 10. casino_games (from game availableCasinos)
  const casinoGames: Row[] = [];
  for (const g of allGames) {
    const d = getGameDetail(g.slug)!;
    const game_id = gameMap.get(g.slug);
    for (const cslug of d.availableCasinos ?? []) {
      const casino_id = casinoMap.get(cslug);
      if (casino_id && game_id) casinoGames.push({ casino_id, game_id });
    }
  }
  await insert("casino_games", dedupe(casinoGames, ["casino_id", "game_id"]));

  // 11. affiliate_links (casino review CTA + bonus claim)
  const affiliate: Row[] = [];
  for (const c of allCasinos) {
    const casino_id = casinoMap.get(c.slug);
    if (casino_id && c.offerUrl)
      affiliate.push({ casino_id, placement: "review_cta", url: c.offerUrl, campaign: null, is_active: true });
  }
  for (const b of allBonuses) {
    const casino_id = casinoMap.get(b.casinoSlug);
    if (casino_id && b.claimUrl)
      affiliate.push({ casino_id, placement: "bonus_claim", url: b.claimUrl, campaign: b.slug, is_active: true });
  }
  await insert("affiliate_links", affiliate);

  console.log("Seed complete.");
}

main().catch((e) => {
  console.error("Seed failed:", e.message ?? e);
  process.exit(1);
});
