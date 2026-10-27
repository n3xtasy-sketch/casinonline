"use server";

import { updateTag } from "next/cache";
import { getSupabaseAuthClient } from "@/lib/supabase/auth-server";
import { logActivity } from "@/lib/db/activity";
import {
  dryRunImport,
  applyImport,
  dryRunAffiliate,
  applyAffiliate,
  MAX_IMPORT_BYTES,
  type ImportReport,
  type ImportOutcome,
  type AffiliateDryRun,
} from "@/lib/db/io";
import { ENTITY_DESCRIPTORS, IO_IMPORT_ENTITIES, type IoEntity } from "@/lib/io/entities";
import type { ImportMode } from "@/lib/io/validate";

function validMode(m: string): m is ImportMode {
  return m === "create" || m === "upsert";
}

type DB = Awaited<ReturnType<typeof getSupabaseAuthClient>>;

async function requireAdmin(): Promise<DB> {
  const db = await getSupabaseAuthClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) throw new Error("Neautentificat.");
  const { data: profile } = await db.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
  if (!(profile as { is_admin?: boolean } | null)?.is_admin) throw new Error("Acces interzis.");
  return db;
}

function validEntity(e: string): e is Exclude<IoEntity, "affiliate_links"> {
  return (IO_IMPORT_ENTITIES as string[]).includes(e);
}

export async function dryRunAction(
  entity: string,
  csvText: string,
  mode: string = "create",
): Promise<ImportReport | AffiliateDryRun | { error: string }> {
  await requireAdmin();
  if (!validMode(mode)) return { error: "Mod de import invalid." };
  if (csvText.length > MAX_IMPORT_BYTES) return { error: "Fișier prea mare (max 2 MB)." };
  if (entity === "affiliate_links") return dryRunAffiliate(csvText, mode);
  if (!validEntity(entity)) return { error: "Entitate neimportabilă." };
  return dryRunImport(entity, csvText, mode);
}

export async function runImportAction(
  entity: string,
  csvText: string,
  hash: string,
  mode: string = "create",
  confirmPublished = false,
  conflictTokens: Record<number, string> = {},
): Promise<ImportOutcome | { error: string }> {
  const db = await requireAdmin();
  if (!validMode(mode)) return { error: "Mod de import invalid." };
  if (csvText.length > MAX_IMPORT_BYTES) return { error: "Fișier prea mare (max 2 MB)." };

  if (entity === "affiliate_links") {
    // affiliate_links resolve live via the SECURITY DEFINER RPCs → no cached surface
    // embeds a link URL, so no updateTag is needed (consistent with the Admin actions).
    const res = await applyAffiliate(csvText, hash, mode, conflictTokens);
    if ("error" in res) return res;
    await logActivity(db, {
      action: "import.affiliate_links",
      entityType: "affiliate_links",
      metadata: { mode, created: res.created, updated: res.updated, unchanged: res.unchanged, skipped: res.skipped, failed: res.failed },
    });
    return res;
  }

  if (!validEntity(entity)) return { error: "Entitate neimportabilă." };

  const res = await applyImport(entity, csvText, hash, mode, confirmPublished);
  if ("error" in res) return res;

  const desc = ENTITY_DESCRIPTORS[entity];
  for (const t of desc.tags) updateTag(t);
  await logActivity(db, {
    action: `import.${entity}`,
    entityType: entity,
    metadata: {
      mode,
      created: res.created,
      updated: res.updated,
      unchanged: res.unchanged,
      skipped: res.skipped,
      failed: res.failed,
    },
  });
  return res;
}
