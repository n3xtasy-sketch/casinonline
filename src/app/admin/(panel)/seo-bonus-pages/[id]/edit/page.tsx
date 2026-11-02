import Link from "next/link";
import { notFound } from "next/navigation";
import { EvergreenBonusPageForm } from "@/components/admin/EvergreenBonusPageForm";
import { getEvergreenPageById, listOperators, listBonusOptions } from "@/lib/db/admin-seo-bonus-pages";
import { deleteEvergreenPage } from "@/app/admin/(panel)/seo-bonus-pages/actions";

export const metadata = { title: "Editează pagina evergreen — Admin" };

interface PageProps { params: Promise<{ id: string }> }

export default async function EditEvergreenPage({ params }: PageProps) {
  const { id } = await params;
  const [page, operators, bonuses] = await Promise.all([getEvergreenPageById(id), listOperators(), listBonusOptions()]);
  if (!page) notFound();
  const del = deleteEvergreenPage.bind(null, id);
  return (
    <div className="flex flex-col gap-4">
      <Link href="/admin/seo-bonus-pages" className="text-[13px] text-ink-muted hover:text-ink-secondary">← Pagini evergreen</Link>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold text-ink">Editează: {page.casinoName} / {page.intent}</h1>
        <span className="text-sm text-ink-muted">/cazinouri-online/{page.casinoSlug}/{page.intent}</span>
      </div>
      <EvergreenBonusPageForm initial={page} operators={operators} bonuses={bonuses} />
      <form action={del} className="mt-4 border-t border-border pt-4">
        <button type="submit" className="text-sm text-danger hover:underline">Șterge pagina</button>
      </form>
    </div>
  );
}
