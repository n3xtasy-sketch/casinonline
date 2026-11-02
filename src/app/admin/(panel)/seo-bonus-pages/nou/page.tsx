import Link from "next/link";
import { EvergreenBonusPageForm } from "@/components/admin/EvergreenBonusPageForm";
import { listOperators, listBonusOptions } from "@/lib/db/admin-seo-bonus-pages";

export const metadata = { title: "Pagină evergreen nouă — Admin" };

export default async function NewEvergreenPage() {
  const [operators, bonuses] = await Promise.all([listOperators(), listBonusOptions()]);
  return (
    <div className="flex flex-col gap-4">
      <Link href="/admin/seo-bonus-pages" className="text-[13px] text-ink-muted hover:text-ink-secondary">← Pagini evergreen</Link>
      <h1 className="text-2xl font-bold text-ink">Pagină evergreen nouă</h1>
      <EvergreenBonusPageForm operators={operators} bonuses={bonuses} />
    </div>
  );
}
