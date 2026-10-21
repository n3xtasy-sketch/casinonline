import "server-only";
import { getSupabaseAuthClient } from "@/lib/supabase/auth-server";
import type { SupabaseClient } from "@supabase/supabase-js";
import * as pipeline from "@/lib/io/pipeline";
import type { ImportMode } from "@/lib/io/validate";
import type { IoEntity } from "@/lib/io/entities";

/**
 * Server entry for the CSV import/export pipeline. The real logic lives in
 * @/lib/io/pipeline (DB-injected, not server-only) so the exact same code is
 * exercised by DEV test scripts; here we only bind the authenticated client.
 */

export {
  MAX_IMPORT_ROWS,
  MAX_IMPORT_BYTES,
  contentHash,
} from "@/lib/io/pipeline";
export type { ImportReport, ImportOutcome, ReportRow } from "@/lib/io/pipeline";

export function dryRunImport(entity: IoEntity, csvText: string, mode: ImportMode = "create") {
  return getSupabaseAuthClient().then((db) =>
    pipeline.dryRunImport(db as unknown as SupabaseClient, entity, csvText, mode),
  );
}

export function applyImport(
  entity: IoEntity,
  csvText: string,
  expectedHash: string,
  mode: ImportMode = "create",
  confirmPublished = false,
) {
  return getSupabaseAuthClient().then((db) =>
    pipeline.applyImport(db as unknown as SupabaseClient, entity, csvText, expectedHash, mode, confirmPublished),
  );
}

export function exportEntity(entity: IoEntity, format: "csv" | "json", filters: { status?: string }) {
  return getSupabaseAuthClient().then((db) =>
    pipeline.exportEntity(db as unknown as SupabaseClient, entity, format, filters),
  );
}
