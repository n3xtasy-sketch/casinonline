import Link from "next/link";
import { notFound } from "next/navigation";
import { getCategoryById } from "@/lib/db/admin-seo-categories";
import { deleteCategory } from "@/app/admin/(panel)/seo-categories/actions";
import { SeoCategoryForm } from "@/components/admin/SeoCategoryForm";
import { categoryPath } from "@/lib/seo-categories";

export const metadata = { title: "Editează categoria SEO — Admin" };

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditSeoCategoryPage({ params }: PageProps) {
  const { id } = await params;
  const category = await getCategoryById(id);
  if (!category) notFound();
  const del = deleteCategory.bind(null, id);

  return (
    <div className="flex flex-col gap-4">
      <Link href="/admin/seo-categories" className="text-[13px] text-ink-muted hover:text-ink-secondary">← Categorii SEO</Link>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold text-ink">Editează: {category.name}</h1>
        <span className="text-sm text-ink-muted">{categoryPath(category.namespace, category.slug)}</span>
      </div>

      <SeoCategoryForm initial={category} />

      <form action={del} className="mt-4 border-t border-border pt-4">
        <button type="submit" className="text-sm text-danger hover:underline">Șterge categoria</button>
      </form>
    </div>
  );
}
