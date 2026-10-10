import { notFound } from "next/navigation";
import { CasinoForm } from "@/components/admin/CasinoForm";
import { getCasinoEdit, listTags, listPaymentMethods, listGames } from "@/lib/db/admin-casinos";
import { updateCasino } from "../../actions";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function EditCasinoPage({ params }: PageProps) {
  const { slug } = await params;
  const [casino, tags, paymentMethods, games] = await Promise.all([
    getCasinoEdit(slug),
    listTags(),
    listPaymentMethods(),
    listGames(),
  ]);
  if (!casino) notFound();

  const action = updateCasino.bind(null, casino.id, casino.slug);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Editează: {casino.name}</h1>
        <p className="mt-1 text-sm text-ink-secondary">Modificările apar public imediat (revalidateTag).</p>
      </div>
      <CasinoForm mode="edit" action={action} initial={casino} tags={tags} paymentMethods={paymentMethods} games={games} />
    </div>
  );
}
