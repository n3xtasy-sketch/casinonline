import "server-only";
import type { ContentStatus } from "@/lib/content-status";
import { getSupabaseAuthClient } from "@/lib/supabase/auth-server";
import type { Option } from "@/lib/db/admin-casinos";
import type { GuideSection, GuideRelatedLink } from "@/types/guide";
import { serializeSections, serializeRelatedLinks } from "@/lib/guide-format";
import { authorName } from "@/lib/authors";
import type { EditorialRowView } from "@/lib/editorial-status";

export interface GuideEditData {
  id: string;
  slug: string;
  title: string;
  categoryId: string;
  excerpt: string;
  imageUrl: string;
  author: string;
  intro: string;
  readingTime: string;
  /** Pre-serialized to the markdown-ish textarea format (never raw JSON). */
  sectionsText: string;
  /** Pre-serialized to "href | label" lines. */
  relatedLinksText: string;
  faq: { question: string; answer: string }[];
  /** YYYY-MM-DD for the date input (empty when unset). */
  publishedAt: string;
  authorSlug: string;
  verifierSlug: string;
  editorialVerifiedAt: string;
}

export async function listGuideCategories(): Promise<Option[]> {
  const db = await getSupabaseAuthClient();
  const { data, error } = await db.from("guide_categories").select("id, label").order("sort_order");
  if (error) throw new Error(`listGuideCategories: ${error.message}`);
  return (data as unknown as Option[]) ?? [];
}

interface EditRow {
  id: string;
  slug: string;
  title: string;
  category_id: string | null;
  excerpt: string | null;
  image_url: string | null;
  author: string | null;
  intro: string | null;
  reading_time: string | null;
  sections: GuideSection[] | null;
  related_links: GuideRelatedLink[] | null;
  faq: { question: string; answer: string }[] | null;
  published_at: string | null;
  author_slug: string | null;
  verifier_slug: string | null;
  editorial_verified_at: string | null;
}

const EDIT_SELECT =
  "id, slug, title, category_id, excerpt, image_url, author, intro, reading_time, sections, related_links, faq, published_at, author_slug, verifier_slug, editorial_verified_at";

export async function getGuideEdit(slug: string): Promise<GuideEditData | null> {
  const db = await getSupabaseAuthClient();
  const { data, error } = await db.from("guides").select(EDIT_SELECT).eq("slug", slug).maybeSingle();
  if (error) throw new Error(`getGuideEdit: ${error.message}`);
  if (!data) return null;
  const r = data as unknown as EditRow;
  return {
    id: r.id,
    slug: r.slug,
    title: r.title,
    categoryId: r.category_id ?? "",
    excerpt: r.excerpt ?? "",
    imageUrl: r.image_url ?? "",
    author: r.author ?? "",
    intro: r.intro ?? "",
    readingTime: r.reading_time ?? "",
    sectionsText: serializeSections(r.sections),
    relatedLinksText: serializeRelatedLinks(r.related_links),
    faq: r.faq ?? [],
    publishedAt: r.published_at ? r.published_at.slice(0, 10) : "",
    authorSlug: r.author_slug ?? "",
    verifierSlug: r.verifier_slug ?? "",
    editorialVerifiedAt: r.editorial_verified_at ? r.editorial_verified_at.slice(0, 10) : "",
  };
}

export interface AdminGuideRow {
  id: string;
  slug: string;
  title: string;
  category: string;
  author: string;
  status: ContentStatus;
  editorial: EditorialRowView;
}

export async function listAdminGuides(filter: "all" | ContentStatus = "all"): Promise<AdminGuideRow[]> {
  const db = await getSupabaseAuthClient();
  let q = db
    .from("guides")
    .select(
      "id, slug, title, author, status, updated_at, author_slug, verifier_slug, editorial_verified_at, category:guide_categories(label)",
    )
    .order("status")
    .order("title");
  if (filter !== "all") q = q.eq("status", filter);
  const { data, error } = await q;
  if (error) throw new Error(`listAdminGuides: ${error.message}`);
  return (
    (data as unknown as {
      id: string; slug: string; title: string; author: string | null;
      status: ContentStatus; category: { label?: string } | null;
      updated_at: string | null; author_slug: string | null;
      verifier_slug: string | null; editorial_verified_at: string | null;
    }[]) ?? []
  ).map((r) => ({
    id: r.id, slug: r.slug, title: r.title, category: r.category?.label ?? "",
    author: r.author ?? "", status: r.status,
    editorial: {
      authorSlug: r.author_slug, verifierSlug: r.verifier_slug,
      editorialVerifiedAt: r.editorial_verified_at,
      authorName: authorName(r.author_slug), verifierName: authorName(r.verifier_slug),
      updatedAt: r.updated_at,
    },
  }));
}
