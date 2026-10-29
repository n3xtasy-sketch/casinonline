import Link from "next/link";
import { SeoCategoryForm } from "@/components/admin/SeoCategoryForm";

export const metadata = { title: "Categorie SEO nouă — Admin" };

export default function NewSeoCategoryPage() {
  return (
    <div className="flex flex-col gap-4">
      <Link href="/admin/seo-categories" className="text-[13px] text-ink-muted hover:text-ink-secondary">← Categorii SEO</Link>
      <h1 className="text-2xl font-bold text-ink">Categorie nouă</h1>
      <SeoCategoryForm />
    </div>
  );
}
