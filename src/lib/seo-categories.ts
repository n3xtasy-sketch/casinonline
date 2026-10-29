/**
 * SEO categories (FAZA SEO-B) — PURE helpers: namespaces, URL paths, deterministic
 * selector→predicate resolution, selector whitelist, slug validation. No I/O.
 *
 * A category lists EXISTING entities via a deterministic `selector` (stored in DB, resolved
 * here) — it never duplicates offers/games/casinos. The free-spins / no-deposit OVERLAP is
 * resolved by the structured bonus flags is_no_deposit + is_no_wagering (migration 0035), so
 * one offer can appear in several categories without duplication.
 */

import { isAllowedDemoUrl } from "@/lib/demo";

export type CategoryNamespace = "bonus" | "game" | "casino";
export const CATEGORY_NAMESPACES: readonly CategoryNamespace[] = ["bonus", "game", "casino"];

/** URL base per namespace (short URLs, no /categorie/ segment). */
export const NAMESPACE_BASE: Record<CategoryNamespace, string> = {
  bonus: "/bonusuri",
  game: "/pacanele-online",
  casino: "/cazinouri-online",
};

export type CategoryStatus = "draft" | "published" | "archived";

export interface SeoCategory {
  id: string;
  namespace: CategoryNamespace;
  slug: string;
  name: string;
  description: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  h1: string | null;
  intro: string | null;
  body: string | null;
  faq: { question: string; answer: string }[];
  selector: string;
  status: CategoryStatus;
  sortOrder: number;
  updatedAt: string;
}

export function categoryPath(namespace: CategoryNamespace, slug: string): string {
  return `${NAMESPACE_BASE[namespace]}/${slug}`;
}

// ── Selector whitelist (what a category may bind to) ────────────────────────────

const BONUS_KINDS = new Set(["no_deposit", "no_deposit+free_spins", "no_wagering"]);
const GAME_KINDS = new Set(["gratis"]);
const CASINO_KINDS = new Set(["license_onjn"]);
// Parameterised kinds: `type=<slug>` (bonus), `category=<slug>` (game), `tag=<slug>` (casino).
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Validate that `selector` is a recognised binding for `namespace`. */
export function isValidSelector(namespace: CategoryNamespace, selector: string): boolean {
  const [ns, ...rest] = selector.split(":");
  if (ns !== namespace || rest.length !== 1) return false;
  const body = rest[0];
  const [kind, arg] = body.includes("=") ? [body.slice(0, body.indexOf("=")), body.slice(body.indexOf("=") + 1)] : [body, null];
  if (namespace === "bonus") {
    if (kind === "type") return !!arg && SLUG_RE.test(arg);
    return arg === null && BONUS_KINDS.has(body);
  }
  if (namespace === "game") {
    if (kind === "category") return !!arg && SLUG_RE.test(arg);
    return arg === null && GAME_KINDS.has(body);
  }
  if (kind === "tag") return !!arg && SLUG_RE.test(arg);
  return arg === null && CASINO_KINDS.has(body);
}

function selectorBody(namespace: CategoryNamespace, selector: string): string {
  return selector.startsWith(`${namespace}:`) ? selector.slice(namespace.length + 1) : selector;
}

// ── Deterministic predicates (entity membership) ────────────────────────────────

export interface BonusClassify {
  typeSlug: string;
  freeSpins?: number | null;
  isNoDeposit?: boolean;
  isNoWagering?: boolean;
}
export function bonusMatches(selector: string, b: BonusClassify): boolean {
  const body = selectorBody("bonus", selector);
  if (body === "no_deposit") return !!b.isNoDeposit;
  if (body === "no_wagering") return !!b.isNoWagering;
  if (body === "no_deposit+free_spins") return !!b.isNoDeposit && (b.freeSpins ?? 0) > 0;
  if (body.startsWith("type=")) return b.typeSlug === body.slice(5);
  return false;
}

export interface GameClassify {
  categorySlug: string;
  demoUrl?: string | null;
}
export function gameMatches(selector: string, g: GameClassify): boolean {
  const body = selectorBody("game", selector);
  if (body === "gratis") return isAllowedDemoUrl(g.demoUrl); // app allowlist (default-deny)
  if (body.startsWith("category=")) return g.categorySlug === body.slice(9);
  return false;
}

export interface CasinoClassify {
  tags?: string[];
  license?: string | null;
  licenseVerifiedAt?: string | null;
}
export function casinoMatches(selector: string, c: CasinoClassify): boolean {
  const body = selectorBody("casino", selector);
  if (body === "license_onjn") return /onjn/i.test(c.license ?? "") && !!c.licenseVerifiedAt; // verifiable only
  if (body.startsWith("tag=")) return (c.tags ?? []).includes(body.slice(4));
  return false;
}

// ── Slug / input validation (CMS, server-side) ─────────────────────────────────

/** Category slug format (same shape as entity slugs; collision vs entities enforced in DB). */
export function isValidCategorySlug(slug: string): boolean {
  return SLUG_RE.test(slug) && slug.length <= 80;
}

export interface CategoryInput {
  namespace: string;
  slug: string;
  name: string;
  selector: string;
  status?: string;
}

/** Validate a create/update payload. Returns an RO error message or null. */
export function validateCategoryInput(input: CategoryInput): string | null {
  if (!CATEGORY_NAMESPACES.includes(input.namespace as CategoryNamespace)) return "Namespace invalid (bonus/game/casino).";
  const ns = input.namespace as CategoryNamespace;
  if (!input.name?.trim()) return "Numele categoriei este obligatoriu.";
  if (input.name.trim().length > 120) return "Numele este prea lung (max 120).";
  if (!isValidCategorySlug(input.slug?.trim() ?? "")) return "Slug invalid (litere mici, cifre, cratime; max 80).";
  if (!isValidSelector(ns, input.selector?.trim() ?? "")) return `Selector invalid pentru namespace „${ns}".`;
  if (input.status && !["draft", "published", "archived"].includes(input.status)) return "Status invalid.";
  return null;
}
