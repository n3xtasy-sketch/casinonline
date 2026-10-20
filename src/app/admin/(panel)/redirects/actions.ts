"use server";

import { redirect } from "next/navigation";
import { getSupabaseAuthClient } from "@/lib/supabase/auth-server";
import { logActivity } from "@/lib/db/activity";
import {
  normalizePath,
  isInternalRedirectPath,
  isReservedPath,
  looksLikeAsset,
  detectChainConflict,
} from "@/lib/redirects";
import type { RedirectFormState } from "./types";

type DB = Awaited<ReturnType<typeof getSupabaseAuthClient>>;

async function requireAdmin(): Promise<DB> {
  const db = await getSupabaseAuthClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) throw new Error("Neautentificat.");
  const { data: profile } = await db
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();
  if (!(profile as { is_admin?: boolean } | null)?.is_admin) throw new Error("Acces interzis.");
  return db;
}

interface Parsed {
  from_path: string;
  to_path: string;
  status_code: number;
  is_active: boolean;
  note: string | null;
}

function parse(formData: FormData): { row: Parsed | null; error: string | null } {
  const from_path = normalizePath(String(formData.get("from_path") ?? ""));
  const to_path = normalizePath(String(formData.get("to_path") ?? ""));
  const status_code = Number(formData.get("status_code")) === 302 ? 302 : 301;
  const is_active = formData.get("is_active") === "on";
  const note = String(formData.get("note") ?? "").trim() || null;

  if (!isInternalRedirectPath(from_path) || !isInternalRedirectPath(to_path)) {
    return { row: null, error: "Ambele căi trebuie să fie interne (încep cu un singur /)." };
  }
  if (isReservedPath(from_path) || looksLikeAsset(from_path)) {
    return { row: null, error: "from_path nu poate fi sub /admin, /go, /api, /_next sau un asset." };
  }
  if (from_path === to_path) {
    return { row: null, error: "Self-loop: from_path și to_path sunt identice." };
  }
  return { row: { from_path, to_path, status_code, is_active, note }, error: null };
}

/** Flat-graph check (only relevant for active redirects). Returns an error msg or null. */
async function chainConflict(
  db: DB,
  from: string,
  to: string,
  excludeId?: string,
): Promise<string | null> {
  // Uses .limit(1) on an array result (NOT .maybeSingle) so a non-unique match
  // on to_path can't throw; a query error is surfaced explicitly (never ignored).
  const check = async (column: "from_path" | "to_path", value: string) => {
    let q = db
      .from("redirects")
      .select("id")
      .eq("is_active", true)
      .eq(column, value)
      .limit(1);
    if (excludeId) q = q.neq("id", excludeId);
    const { data, error } = await q;
    if (error) return { exists: false, error: error.message };
    return { exists: (data?.length ?? 0) > 0, error: null };
  };
  return detectChainConflict(check, from, to);
}

export async function createRedirect(
  _prev: RedirectFormState,
  formData: FormData,
): Promise<RedirectFormState> {
  const db = await requireAdmin();
  const { row, error } = parse(formData);
  if (error || !row) return { error: error ?? "Date invalide." };

  if (row.is_active) {
    const conflict = await chainConflict(db, row.from_path, row.to_path);
    if (conflict) return { error: conflict };
  }

  const { error: insErr } = await db.from("redirects").insert(row);
  if (insErr) {
    if (insErr.code === "23505") return { error: "Există deja un redirect pentru acest from_path." };
    return { error: `Eroare la salvare: ${insErr.message}` };
  }
  await logActivity(db, { action: "redirect.create", entityType: "redirect", label: row.from_path, metadata: { to: row.to_path, code: row.status_code } });
  redirect("/admin/redirects");
}

export async function updateRedirect(
  id: string,
  _prev: RedirectFormState,
  formData: FormData,
): Promise<RedirectFormState> {
  const db = await requireAdmin();
  const { row, error } = parse(formData);
  if (error || !row) return { error: error ?? "Date invalide." };

  if (row.is_active) {
    const conflict = await chainConflict(db, row.from_path, row.to_path, id);
    if (conflict) return { error: conflict };
  }

  const { error: updErr } = await db.from("redirects").update(row).eq("id", id);
  if (updErr) {
    if (updErr.code === "23505") return { error: "Există deja un redirect pentru acest from_path." };
    return { error: `Eroare la salvare: ${updErr.message}` };
  }
  await logActivity(db, { action: "redirect.update", entityType: "redirect", entityId: id, label: row.from_path, metadata: { to: row.to_path, code: row.status_code } });
  redirect("/admin/redirects");
}

export type ToggleResult = { ok: true } | { error: string };

/** Activate/deactivate. Re-validates the flat-graph rule when activating. No DELETE. */
export async function setRedirectActive(id: string, active: boolean): Promise<ToggleResult> {
  const db = await requireAdmin();
  if (active) {
    const { data } = await db
      .from("redirects")
      .select("from_path, to_path")
      .eq("id", id)
      .maybeSingle();
    const r = data as { from_path: string; to_path: string } | null;
    if (r) {
      const conflict = await chainConflict(db, r.from_path, r.to_path, id);
      if (conflict) return { error: conflict };
    }
  }
  const { error } = await db.from("redirects").update({ is_active: active }).eq("id", id);
  if (error) return { error: `Eroare: ${error.message}` };
  await logActivity(db, { action: "redirect.toggle", entityType: "redirect", entityId: id, metadata: { active } });
  return { ok: true };
}
