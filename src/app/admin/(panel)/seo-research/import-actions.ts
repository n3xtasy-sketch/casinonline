"use server";

import { getSupabaseAuthClient } from "@/lib/supabase/auth-server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { logActivity } from "@/lib/db/activity";
import {
  dryRunAhrefs,
  applyAhrefs,
  detectMapping,
  parseAhrefsCsv,
  AHREFS_MAX_BYTES,
  type AhrefsDryRun,
  type AhrefsOutcome,
  type ColumnMapping,
  type BuildOpts,
} from "@/lib/io/ahrefs-import";

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

/** RLS already blocks non-admins; this also rejects imports into a project the admin can't see. */
async function assertProject(db: DB, projectId: string): Promise<string | null> {
  const { data } = await db.from("seo_projects").select("id").eq("id", projectId).maybeSingle();
  return data ? null : "Proiect inexistent sau inaccesibil.";
}

function buildOpts(mapping: ColumnMapping | null, headers: string[], wizardCountry: string, countryMode: "wizard" | "csv"): BuildOpts {
  const resolved = mapping ?? detectMapping(headers).mapping;
  return { mapping: resolved, wizardCountry: wizardCountry || "ro", countryMode };
}

export async function dryRunAhrefsAction(
  projectId: string,
  csvText: string,
  mapping: ColumnMapping | null,
  wizardCountry: string,
  countryMode: "wizard" | "csv",
): Promise<AhrefsDryRun | { error: string }> {
  const db = await requireAdmin();
  const pErr = await assertProject(db, projectId);
  if (pErr) return { error: pErr };
  if (csvText.length > AHREFS_MAX_BYTES) return { error: "Fișier prea mare (max 2 MB)." };
  const parsed = parseAhrefsCsv(csvText);
  if (parsed.error) return { error: parsed.error };
  return dryRunAhrefs(db as unknown as SupabaseClient, projectId, csvText, buildOpts(mapping, parsed.headers, wizardCountry, countryMode));
}

export async function applyAhrefsAction(
  projectId: string,
  filename: string,
  csvText: string,
  mapping: ColumnMapping,
  wizardCountry: string,
  countryMode: "wizard" | "csv",
  hash: string,
): Promise<AhrefsOutcome | { error: string }> {
  const db = await requireAdmin();
  const pErr = await assertProject(db, projectId);
  if (pErr) return { error: pErr };
  if (csvText.length > AHREFS_MAX_BYTES) return { error: "Fișier prea mare (max 2 MB)." };

  const opts = buildOpts(mapping, [], wizardCountry, countryMode);
  const res = await applyAhrefs(db as unknown as SupabaseClient, projectId, filename, csvText, opts, hash);
  // Discriminate on `status` — a PARTIAL outcome is a (successful-but-incomplete)
  // AhrefsOutcome that also carries an `error` message; only the {error}-only shape is a
  // hard pre-check failure.
  if (!("status" in res)) return res;

  await logActivity(db, {
    action: "seo_import.ahrefs",
    entityType: "seo_project",
    entityId: projectId,
    metadata: { importId: res.importId, status: res.status, created: res.created, updated: res.updated, processed: res.processed, total: res.total, filename },
  });
  return res;
}
