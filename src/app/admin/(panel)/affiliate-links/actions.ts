"use server";

import { redirect } from "next/navigation";
import { getSupabaseAuthClient } from "@/lib/supabase/auth-server";
import { logActivity } from "@/lib/db/activity";
import { PLACEMENT_VALUES } from "@/lib/affiliate-placements";
import type { AffiliateFormState } from "./types";

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

/** trim; empty → null (campaign normalization per spec). */
function normalizeCampaign(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  return s || null;
}

interface ParsedFields {
  casino_id: string;
  placement: string;
  url: string;
  campaign: string | null;
  is_active: boolean;
}

function parseFields(formData: FormData): { fields: ParsedFields | null; error: string | null } {
  const casino_id = String(formData.get("casino_id") ?? "").trim();
  if (!casino_id) return { fields: null, error: "Selectează un cazino." };

  const placement = String(formData.get("placement") ?? "").trim();
  if (!PLACEMENT_VALUES.includes(placement)) {
    return { fields: null, error: "Placement invalid." };
  }

  const url = String(formData.get("url") ?? "").trim();
  if (!/^https:\/\/\S+$/.test(url)) {
    return { fields: null, error: "URL invalid — trebuie să înceapă cu https://" };
  }

  return {
    fields: {
      casino_id,
      placement,
      url,
      campaign: normalizeCampaign(formData.get("campaign")),
      is_active: formData.get("is_active") === "on",
    },
    error: null,
  };
}

/** Friendly pre-check for the 0013 partial unique index (active per casino+placement+campaign). */
async function activeDuplicateExists(
  db: DB,
  fields: ParsedFields,
  excludeId?: string,
): Promise<boolean> {
  if (!fields.is_active) return false;
  let q = db
    .from("affiliate_links")
    .select("id")
    .eq("casino_id", fields.casino_id)
    .eq("placement", fields.placement)
    .eq("is_active", true);
  q = fields.campaign === null ? q.is("campaign", null) : q.eq("campaign", fields.campaign);
  if (excludeId) q = q.neq("id", excludeId);
  const { data } = await q.maybeSingle();
  return Boolean(data);
}

const DUP_MSG =
  "Există deja un link activ pentru acest cazino + placement + campanie. Dezactivează-l pe celălalt întâi.";

export async function createAffiliateLink(
  _prev: AffiliateFormState,
  formData: FormData,
): Promise<AffiliateFormState> {
  const db = await requireAdmin();
  const { fields, error } = parseFields(formData);
  if (error || !fields) return { error: error ?? "Date invalide." };

  if (await activeDuplicateExists(db, fields)) return { error: DUP_MSG };

  const { error: insErr } = await db.from("affiliate_links").insert(fields);
  if (insErr) {
    if (insErr.code === "23505") return { error: DUP_MSG };
    return { error: `Eroare la salvare: ${insErr.message}` };
  }
  // No updateTag: /go resolves live via the RPC; no cached surface embeds this.
  await logActivity(db, { action: "affiliate_link.create", entityType: "affiliate_link", label: fields.placement, metadata: { placement: fields.placement } });
  redirect("/admin/affiliate-links");
}

export async function updateAffiliateLink(
  id: string,
  _prev: AffiliateFormState,
  formData: FormData,
): Promise<AffiliateFormState> {
  const db = await requireAdmin();
  const { fields, error } = parseFields(formData);
  if (error || !fields) return { error: error ?? "Date invalide." };

  if (await activeDuplicateExists(db, fields, id)) return { error: DUP_MSG };

  const { error: updErr } = await db.from("affiliate_links").update(fields).eq("id", id);
  if (updErr) {
    if (updErr.code === "23505") return { error: DUP_MSG };
    return { error: `Eroare la salvare: ${updErr.message}` };
  }
  await logActivity(db, { action: "affiliate_link.update", entityType: "affiliate_link", entityId: id, label: fields.placement, metadata: { placement: fields.placement } });
  redirect("/admin/affiliate-links");
}

/** Toggle is_active (soft-delete / reactivate). No physical delete. */
export async function setAffiliateActive(formData: FormData): Promise<void> {
  const db = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const active = String(formData.get("active") ?? "") === "true";
  if (!id) throw new Error("ID lipsă.");

  // Re-activation can collide with the active-unique index → surface it gracefully.
  if (active) {
    const { data: row } = await db
      .from("affiliate_links")
      .select("casino_id, placement, campaign")
      .eq("id", id)
      .maybeSingle();
    const r = row as { casino_id: string; placement: string; campaign: string | null } | null;
    if (r) {
      let q = db
        .from("affiliate_links")
        .select("id")
        .eq("casino_id", r.casino_id)
        .eq("placement", r.placement)
        .eq("is_active", true)
        .neq("id", id);
      q = r.campaign === null ? q.is("campaign", null) : q.eq("campaign", r.campaign);
      const { data: clash } = await q.maybeSingle();
      if (clash) throw new Error(DUP_MSG);
    }
  }

  const { error } = await db.from("affiliate_links").update({ is_active: active }).eq("id", id);
  if (error) throw new Error(`Eroare la schimbarea statusului: ${error.message}`);
  await logActivity(db, { action: active ? "affiliate_link.activate" : "affiliate_link.deactivate", entityType: "affiliate_link", entityId: id });
  redirect("/admin/affiliate-links");
}
