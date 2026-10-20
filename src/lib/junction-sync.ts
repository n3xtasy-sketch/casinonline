/**
 * Atomic junction sync via the `sync_junction` Postgres RPC (migration 0021).
 * Pure + injectable `rpc` runner so the contract is unit-testable without a DB.
 */

export const JUNCTION_RPC = "sync_junction";

export type JunctionTable = "casino_tags" | "casino_games" | "casino_payment_methods";
export type JunctionCol = "casino_id" | "game_id" | "payment_method_id" | "tag_id";

/** Minimal shape of a Supabase `.rpc()` call result we depend on. */
export interface RpcRunner {
  (name: string, params: Record<string, unknown>): Promise<{ error: { message: string } | null }>;
}

/**
 * Replace a junction's rows for one `self` side with `ids` for the `other` side,
 * ATOMICALLY: the RPC runs delete+insert in a single transaction, so a failed
 * insert rolls back the delete and existing relations are preserved.
 *
 * Returns an error message on failure (query / RLS / constraint) — NEVER swallows
 * it. The caller must treat a non-null result as a hard failure: do not report
 * success, do not redirect, do not log a success activity.
 */
export async function syncJunctionAtomic(
  rpc: RpcRunner,
  table: JunctionTable,
  selfCol: Exclude<JunctionCol, "tag_id">,
  selfId: string,
  otherCol: JunctionCol,
  ids: string[],
): Promise<string | null> {
  const unique = [...new Set(ids.filter(Boolean))];
  const { error } = await rpc(JUNCTION_RPC, {
    p_table: table,
    p_self_col: selfCol,
    p_self_id: selfId,
    p_other_col: otherCol,
    p_other_ids: unique,
  });
  if (error) return `Eroare la salvarea relațiilor (${table}): ${error.message}`;
  return null;
}
