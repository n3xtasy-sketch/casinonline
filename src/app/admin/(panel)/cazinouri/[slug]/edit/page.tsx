import { notFound } from "next/navigation";
import { CasinoForm } from "@/components/admin/CasinoForm";
import { getCasinoEdit, listTags, listPaymentMethods, listGames } from "@/lib/db/admin-casinos";
import { ContentStatusControl, StatusBadge } from "@/components/admin/ContentStatusControl";
import { updateCasino, setCasinoStatus } from "../../actions";

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
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-ink">Editează: {casino.name}</h1>
          <StatusBadge status={casino.status} />
        </div>
        <ContentStatusControl id={casino.id} status={casino.status} action={setCasinoStatus} />
      </div>
      <CasinoForm mode="edit" action={action} initial={casino} tags={tags} paymentMethods={paymentMethods} games={games} />
    </div>
  );
}
