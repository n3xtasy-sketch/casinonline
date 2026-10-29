import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPublishedCategory, getCategoryEntities } from "@/lib/db/seo-categories";
import { CategoryPage, categoryMetadata } from "@/components/seo/CategoryPage";

// Under /bonusuri we serve ONLY category (comparison) pages — individual offers stay under
// /bonusuri-casino/[slug] (until SEO-C). An unknown slug is a 404, never an offer page.
interface PageProps {
  params: Promise<{ slug: string }>;
}

export const instant = false;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const category = await getPublishedCategory("bonus", slug);
  return category ? categoryMetadata(category) : {};
}

export default async function BonusCategoryPage({ params }: PageProps) {
  const { slug } = await params;
  const category = await getPublishedCategory("bonus", slug);
  if (!category) notFound();
  const entities = await getCategoryEntities(category);
  return <CategoryPage category={category} entities={entities} />;
}
