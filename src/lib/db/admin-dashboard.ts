import "server-only";
import { getSupabaseAuthClient } from "@/lib/supabase/auth-server";

type DB = Awaited<ReturnType<typeof getSupabaseAuthClient>>;

/* ----------------------------------- types ----------------------------------- */

export interface DashboardCounts {
  casinosActive: number;
  casinosArchived: number;
  bonuses: number;
  games: number;
  providers: number;
  payments: number;
  guides: number;
  affiliateActive: number;
}

export type Severity = "high" | "medium" | "info";

export interface HealthItem {
  label: string;
  href: string;
}

export interface HealthRule {
  key: string;
  title: string;
  severity: Severity;
  hint: string;
  items: HealthItem[];
}

export interface DashboardData {
  counts: DashboardCounts;
  rules: HealthRule[];
}

/* --------------------------------- helpers --------------------------------- */

async function count(
  db: DB,
  table: string,
  col?: string,
  val?: string | boolean,
): Promise<number> {
  const base = db.from(table).select("*", { count: "exact", head: true });
  const { count: c } = await (col !== undefined ? base.eq(col, val) : base);
  return c ?? 0;
}

function isEmptyFaq(faq: unknown): boolean {
  return !Array.isArray(faq) || faq.length === 0;
}
function blank(v: unknown): boolean {
  return v == null || String(v).trim() === "";
}

/* row shapes (only the fields the health rules read) */
interface CasinoRow {
  id: string;
  slug: string;
  name: string;
  status: string;
  logo_url: string | null;
  intro: string | null;
  editor_review: string | null;
  faq: unknown;
}
interface GameRow {
  slug: string;
  name: string;
  provider_id: string | null;
  category_id: string | null;
  thumbnail_url: string | null;
  intro: string | null;
  faq: unknown;
}
interface ProviderRow {
  slug: string;
  name: string;
  game_count: number | null;
  logo_url: string | null;
  intro: string | null;
  faq: unknown;
}
interface PaymentRow {
  id: string;
  slug: string;
  name: string;
  logo_url: string | null;
  intro: string | null;
  faq: unknown;
}
interface BonusRow {
  slug: string;
  offer: string;
  intro: string | null;
  faq: unknown;
  casino: { slug: string; name: string; status: string } | null;
}
interface GuideRow {
  slug: string;
  title: string;
  intro: string | null;
  sections: unknown;
  faq: unknown;
}

const EDIT = {
  casino: (s: string) => `/admin/cazinouri/${s}/edit`,
  bonus: (s: string) => `/admin/bonusuri/${s}/edit`,
  game: (s: string) => `/admin/jocuri/${s}/edit`,
  provider: (s: string) => `/admin/furnizori/${s}/edit`,
  payment: (s: string) => `/admin/metode-de-plata/${s}/edit`,
  guide: (s: string) => `/admin/ghiduri/${s}/edit`,
};

/* ------------------------------- main reader ------------------------------- */

/** Counts + content-quality/health rules. Read-only, admin session (sees all). */
export async function getDashboardData(): Promise<DashboardData> {
  const db = await getSupabaseAuthClient();

  const [
    casinosActive,
    casinosArchived,
    bonusesCount,
    gamesCount,
    providersCount,
    paymentsCount,
    guidesCount,
    affiliateActive,
    casinosRes,
    gamesRes,
    providersRes,
    paymentsRes,
    bonusesRes,
    guidesRes,
    affReviewRes,
    cpmRes,
  ] = await Promise.all([
    count(db, "casinos", "status", "published"),
    count(db, "casinos", "status", "archived"),
    count(db, "bonuses"),
    count(db, "games"),
    count(db, "providers"),
    count(db, "payment_methods"),
    count(db, "guides"),
    count(db, "affiliate_links", "is_active", true),
    db.from("casinos").select("id, slug, name, status, logo_url, intro, editor_review, faq"),
    db.from("games").select("slug, name, provider_id, category_id, thumbnail_url, intro, faq"),
    db.from("providers").select("slug, name, game_count, logo_url, intro, faq"),
    db.from("payment_methods").select("id, slug, name, logo_url, intro, faq"),
    db
      .from("bonuses")
      .select("slug, offer, intro, faq, casino:casinos(slug, name, status)"),
    db.from("guides").select("slug, title, intro, sections, faq"),
    db
      .from("affiliate_links")
      .select("casino_id")
      .eq("placement", "review_cta")
      .eq("is_active", true),
    db.from("casino_payment_methods").select("payment_method_id"),
  ]);

  const casinos = (casinosRes.data as unknown as CasinoRow[]) ?? [];
  const games = (gamesRes.data as unknown as GameRow[]) ?? [];
  const providers = (providersRes.data as unknown as ProviderRow[]) ?? [];
  const payments = (paymentsRes.data as unknown as PaymentRow[]) ?? [];
  const bonuses = (bonusesRes.data as unknown as BonusRow[]) ?? [];
  const guides = (guidesRes.data as unknown as GuideRow[]) ?? [];
  const reviewCasinoIds = new Set(
    ((affReviewRes.data as unknown as { casino_id: string }[]) ?? []).map((r) => r.casino_id),
  );
  const paymentIdsWithCasino = new Set(
    ((cpmRes.data as unknown as { payment_method_id: string }[]) ?? []).map(
      (r) => r.payment_method_id,
    ),
  );

  // casino_id presence in bonuses (for "casino without bonus")
  const bonusCasinoSlugs = new Set(bonuses.map((b) => b.casino?.slug).filter(Boolean) as string[]);

  const activeCasinos = casinos.filter((c) => c.status === "published");

  const rules: HealthRule[] = [
    // ---- jocuri ----
    {
      key: "game-no-provider",
      title: "Jocuri fără furnizor",
      severity: "high",
      hint: "provider_id lipsă — pagina furnizorului nu le listează.",
      items: games
        .filter((g) => !g.provider_id)
        .map((g) => ({ label: g.name, href: EDIT.game(g.slug) })),
    },
    {
      key: "game-no-category",
      title: "Jocuri fără categorie",
      severity: "high",
      hint: "category_id lipsă — filtrarea pe categorie nu le prinde.",
      items: games
        .filter((g) => !g.category_id)
        .map((g) => ({ label: g.name, href: EDIT.game(g.slug) })),
    },
    {
      key: "game-no-thumb",
      title: "Jocuri fără thumbnail",
      severity: "medium",
      hint: "thumbnail_url lipsă — cardul folosește placeholder.",
      items: games
        .filter((g) => blank(g.thumbnail_url))
        .map((g) => ({ label: g.name, href: EDIT.game(g.slug) })),
    },
    // ---- cazinouri ----
    {
      key: "casino-no-review-cta",
      title: "Cazinouri fără link review_cta activ",
      severity: "high",
      hint: "/go nu are link principal → fallback on-site.",
      items: activeCasinos
        .filter((c) => !reviewCasinoIds.has(c.id))
        .map((c) => ({ label: c.name, href: EDIT.casino(c.slug) })),
    },
    {
      key: "casino-no-bonus",
      title: "Cazinouri fără bonus",
      severity: "medium",
      hint: "Niciun bonus asociat — cardul nu afișează ofertă.",
      items: activeCasinos
        .filter((c) => !bonusCasinoSlugs.has(c.slug))
        .map((c) => ({ label: c.name, href: EDIT.casino(c.slug) })),
    },
    {
      key: "casino-no-logo",
      title: "Cazinouri fără logo",
      severity: "medium",
      hint: "logo_url lipsă.",
      items: casinos
        .filter((c) => blank(c.logo_url))
        .map((c) => ({ label: c.name, href: EDIT.casino(c.slug) })),
    },
    {
      key: "casino-no-review",
      title: "Cazinouri fără recenzie editorială",
      severity: "medium",
      hint: "editor_review gol — conținut editorial subțire.",
      items: casinos
        .filter((c) => blank(c.editor_review))
        .map((c) => ({ label: c.name, href: EDIT.casino(c.slug) })),
    },
    // ---- bonusuri ----
    {
      key: "bonus-archived-casino",
      title: "Bonusuri al căror cazino este arhivat",
      severity: "high",
      hint: "Cazinoul e arhivat → bonusul e ascuns public (CTA mort).",
      items: bonuses
        .filter((b) => b.casino?.status === "archived")
        .map((b) => ({ label: `${b.offer} · ${b.casino?.name ?? ""}`, href: EDIT.bonus(b.slug) })),
    },
    // ---- furnizori ----
    {
      key: "provider-no-games",
      title: "Furnizori fără jocuri",
      severity: "medium",
      hint: "game_count = 0.",
      items: providers
        .filter((p) => (p.game_count ?? 0) === 0)
        .map((p) => ({ label: p.name, href: EDIT.provider(p.slug) })),
    },
    {
      key: "provider-no-logo",
      title: "Furnizori fără logo",
      severity: "medium",
      hint: "logo_url lipsă.",
      items: providers
        .filter((p) => blank(p.logo_url))
        .map((p) => ({ label: p.name, href: EDIT.provider(p.slug) })),
    },
    // ---- metode ----
    {
      key: "payment-no-casino",
      title: "Metode de plată fără cazinouri",
      severity: "medium",
      hint: "Niciun cazino nu o acceptă.",
      items: payments
        .filter((p) => !paymentIdsWithCasino.has(p.id))
        .map((p) => ({ label: p.name, href: EDIT.payment(p.slug) })),
    },
    // ---- ghiduri ----
    {
      key: "guide-no-sections",
      title: "Ghiduri fără secțiuni",
      severity: "medium",
      hint: "sections gol — articol fără corp.",
      items: guides
        .filter((g) => !Array.isArray(g.sections) || g.sections.length === 0)
        .map((g) => ({ label: g.title, href: EDIT.guide(g.slug) })),
    },
    // ---- transversale: intro ----
    {
      key: "no-intro",
      title: "Intro lipsă",
      severity: "high",
      hint: "intro gol — lipsește descrierea de sus + meta description derivată.",
      items: [
        ...casinos.filter((c) => blank(c.intro)).map((c) => ({ label: `Cazino: ${c.name}`, href: EDIT.casino(c.slug) })),
        ...games.filter((g) => blank(g.intro)).map((g) => ({ label: `Joc: ${g.name}`, href: EDIT.game(g.slug) })),
        ...providers.filter((p) => blank(p.intro)).map((p) => ({ label: `Furnizor: ${p.name}`, href: EDIT.provider(p.slug) })),
        ...payments.filter((p) => blank(p.intro)).map((p) => ({ label: `Metodă: ${p.name}`, href: EDIT.payment(p.slug) })),
        ...bonuses.filter((b) => blank(b.intro)).map((b) => ({ label: `Bonus: ${b.offer}`, href: EDIT.bonus(b.slug) })),
        ...guides.filter((g) => blank(g.intro)).map((g) => ({ label: `Ghid: ${g.title}`, href: EDIT.guide(g.slug) })),
      ],
    },
    // ---- transversale: FAQ ----
    {
      key: "no-faq",
      title: "FAQ goale",
      severity: "high",
      hint: "Fără FAQ → fără structured data FAQPage.",
      items: [
        ...casinos.filter((c) => isEmptyFaq(c.faq)).map((c) => ({ label: `Cazino: ${c.name}`, href: EDIT.casino(c.slug) })),
        ...games.filter((g) => isEmptyFaq(g.faq)).map((g) => ({ label: `Joc: ${g.name}`, href: EDIT.game(g.slug) })),
        ...providers.filter((p) => isEmptyFaq(p.faq)).map((p) => ({ label: `Furnizor: ${p.name}`, href: EDIT.provider(p.slug) })),
        ...payments.filter((p) => isEmptyFaq(p.faq)).map((p) => ({ label: `Metodă: ${p.name}`, href: EDIT.payment(p.slug) })),
        ...bonuses.filter((b) => isEmptyFaq(b.faq)).map((b) => ({ label: `Bonus: ${b.offer}`, href: EDIT.bonus(b.slug) })),
        ...guides.filter((g) => isEmptyFaq(g.faq)).map((g) => ({ label: `Ghid: ${g.title}`, href: EDIT.guide(g.slug) })),
      ],
    },
  ];

  return {
    counts: {
      casinosActive,
      casinosArchived,
      bonuses: bonusesCount,
      games: gamesCount,
      providers: providersCount,
      payments: paymentsCount,
      guides: guidesCount,
      affiliateActive,
    },
    rules,
  };
}
