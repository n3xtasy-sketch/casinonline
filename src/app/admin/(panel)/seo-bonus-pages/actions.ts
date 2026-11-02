"use server";

import { redirect } from "next/navigation";
import { updateTag } from "next/cache";
import { getSupabaseAuthClient } from "@/lib/supabase/auth-server";
import { logActivity } from "@/lib/db/activity";
import { isValidIntent, evergreenBonusMatches } from "@/lib/evergreen-bonus";

type DB = Awaited<ReturnType<typeof getSupabaseAuthClient>>;

async function requireAdmin(): Promise<DB> {
  const db = await getSupabaseAuthClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) throw new Error("Neautentificat.");
  const { data: profile } = await db.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
  if (!(profile as { is_admin?: boolean } | null)?.is_admin) throw new Error("Acces interzis.");
  return db;
}

export interface EvergreenFormState { error: string | null }

function parseFaq(raw: string): { question: string; answer: string }[] {
  return raw.split("\n").map((l) => l.trim()).filter(Boolean).map((l) => {
    const i = l.indexOf("|");
    return i === -1 ? { question: l, answer: "" } : { question: l.slice(0, i).trim(), answer: l.slice(i + 1).trim() };
  }).filter((f) => f.question && f.answer);
}

export async function saveEvergreenPage(_prev: EvergreenFormState, formData: FormData): Promise<EvergreenFormState> {
  const db = await requireAdmin();
  const s = (k: string) => String(formData.get(k) ?? "").trim();
  const id = s("id") || null;
  const casinoId = s("casino_id");
  const intent = s("intent");
  const featuredBonusId = s("featured_bonus_id") || null;
  const status = s("status") || "draft";

  if (!casinoId) return { error: "Selectează operatorul." };
  if (!isValidIntent(intent)) return { error: "Intenție SEO invalidă (nu există în registru)." };
  if (!["draft", "published", "archived"].includes(status)) return { error: "Status invalid." };

  // Operator must be published.
  const { data: casino } = await db.from("casinos").select("id, status").eq("id", casinoId).maybeSingle();
  const c = casino as { id: string; status: string } | null;
  if (!c) return { error: "Operator inexistent." };
  if (status === "published" && c.status !== "published") return { error: "Nu poți publica o pagină pentru un operator nepublicat." };

  // Featured offer: must belong to this operator AND match the SEO intent.
  if (featuredBonusId) {
    const { data: b } = await db
      .from("bonuses")
      .select("casino_id, free_spins, is_no_deposit, is_no_wagering, bonus_type:bonus_types(slug)")
      .eq("id", featuredBonusId).maybeSingle();
    const bonus = b as { casino_id: string; free_spins: number | null; is_no_deposit: boolean; is_no_wagering: boolean; bonus_type: { slug: string } | null } | null;
    if (!bonus) return { error: "Oferta featured inexistentă." };
    if (bonus.casino_id !== casinoId) return { error: "Oferta featured aparține altui operator." };
    if (!evergreenBonusMatches(intent, { typeSlug: bonus.bonus_type?.slug ?? "", freeSpins: bonus.free_spins, isNoDeposit: bonus.is_no_deposit, isNoWagering: bonus.is_no_wagering })) {
      return { error: `Oferta featured nu corespunde intenției „${intent}".` };
    }
  }

  const row = {
    casino_id: casinoId, intent, featured_bonus_id: featuredBonusId, status,
    h1: s("h1") || null, intro: s("intro") || null, body: s("body") || null, faq: parseFaq(s("faq")),
    meta_title: s("meta_title") || null, meta_description: s("meta_description") || null,
    sort_order: Number(s("sort_order")) || 0,
  };

  let pageId = id;
  if (id) {
    const { error } = await db.from("seo_bonus_pages").update(row).eq("id", id);
    if (error) return { error: `Eroare la salvare: ${error.message}` };
  } else {
    const { data, error } = await db.from("seo_bonus_pages").insert(row).select("id").single();
    if (error || !data) return { error: `Eroare la salvare: ${error?.message ?? "necunoscută"}` };
    pageId = (data as { id: string }).id;
  }
  await logActivity(db, { action: id ? "seo_bonus_page.update" : "seo_bonus_page.create", entityType: "seo_bonus_page", entityId: pageId!, label: `${intent}` });
  updateTag("seo_bonus_pages");
  redirect("/admin/seo-bonus-pages");
}

export async function deleteEvergreenPage(id: string): Promise<void> {
  const db = await requireAdmin();
  const { error } = await db.from("seo_bonus_pages").delete().eq("id", id);
  if (error) throw new Error(`Ștergere eșuată: ${error.message}`);
  await logActivity(db, { action: "seo_bonus_page.delete", entityType: "seo_bonus_page", entityId: id });
  updateTag("seo_bonus_pages");
  redirect("/admin/seo-bonus-pages");
}
