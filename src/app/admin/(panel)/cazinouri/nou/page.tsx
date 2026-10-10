import { CasinoForm } from "@/components/admin/CasinoForm";
import { listTags, listPaymentMethods, listGames } from "@/lib/db/admin-casinos";
import { createCasino } from "../actions";

export default async function NewCasinoPage() {
  const [tags, paymentMethods, games] = await Promise.all([
    listTags(),
    listPaymentMethods(),
    listGames(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Adaugă cazino</h1>
        <p className="mt-1 text-sm text-ink-secondary">Un slug nou devine accesibil imediat după salvare.</p>
      </div>
      <CasinoForm mode="create" action={createCasino} tags={tags} paymentMethods={paymentMethods} games={games} />
    </div>
  );
}
