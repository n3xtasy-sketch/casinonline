/**
 * Pure planning for the atomic per-row apply (import_apply_row RPC, migration 0022).
 * Decides, from a built row + its diff, the scalar patch and the junction syncs to
 * send — or null when nothing changed (so no UPDATE runs).
 */

import type { Relation, RowLevel } from "@/lib/io/validate";
import type { RowDiff } from "@/lib/io/diff";

/** Columns import_apply_row is allowed to write, per table. MUST match the SQL
 * whitelist in supabase/migrations/0022_import_apply_row_rpc.sql. `status` is
 * intentionally absent everywhere — status is never written by import. */
export const WRITABLE_COLUMNS: Record<string, string[]> = {
  casinos: ["slug", "offer_url", "name", "year_launched", "logo_url", "rating", "editor_score", "license",
    "license_verified_at", "license_source", "payout_speed", "withdrawal_time", "verified_at",
    "verification_source", "min_deposit", "kyc", "support", "mobile",
    "intro", "editor_review", "pros", "cons"],
  bonuses: ["slug", "claim_url", "casino_id", "bonus_type_id", "offer", "free_spins", "wagering",
    "code", "min_deposit", "validity", "intro", "terms", "pros", "cons", "how_to_claim"],
  games: ["slug", "name", "thumbnail_url", "rtp", "volatility", "max_win", "release_year",
    "reels", "paylines", "bet_range", "intro", "mechanics", "bonus_features", "provider_id", "category_id"],
  providers: ["slug", "name", "logo_url", "category", "founded", "country", "specialty", "rtp_range", "intro"],
  payment_methods: ["slug", "name", "logo_url", "deposit_speed", "withdrawal_speed", "fees", "min_limit",
    "max_limit", "intro", "deposits", "withdrawals", "pros", "cons", "payment_type_id"],
  guides: ["slug", "title", "excerpt", "image_url", "author", "intro", "reading_time",
    "category_id", "sections", "faq", "related_links"],
};

export interface JunctionSpec {
  table: string;
  self_col: string;
  other_col: string;
  ids: string[];
}

export interface ApplyRowPlan {
  patch: Record<string, unknown>; // scalar patch (empty if only relations changed)
  junctions: JunctionSpec[]; // only relations that actually changed
}

/** Minimal shape of a built upsert row we need to plan an update. */
export interface PlannableRow {
  level: RowLevel;
  operation: "create" | "update" | "skip";
  targetId: string | null;
  dbRow: Record<string, unknown>;
  relations: Relation[];
  diff: RowDiff | null;
}

/**
 * Decide what to apply for an UPDATE row. Returns null when the row must NOT be
 * updated (error, not an update, no target, or no real change). Otherwise returns
 * the scalar patch (only when fields changed) and the junction syncs (only the
 * relations that actually changed).
 */
export function planRowUpdate(b: PlannableRow): ApplyRowPlan | null {
  if (b.level === "error" || b.operation !== "update" || !b.targetId) return null;
  const diff = b.diff;
  if (!diff || !diff.hasChanges) return null; // no UPDATE for unchanged rows

  const patch = diff.fields.length ? b.dbRow : {};
  const changedCols = new Set(diff.relations.map((r) => r.col));
  const junctions: JunctionSpec[] = b.relations
    .filter((r) => changedCols.has(r.col))
    .map((r) => ({ table: r.junction, self_col: r.selfCol, other_col: r.otherCol, ids: r.ids }));

  return { patch, junctions };
}
