import { BonusForm } from "@/components/admin/BonusForm";
import { listCasinos, listBonusTypes } from "@/lib/db/admin-bonuses";
import { createBonus } from "../actions";

export default async function NewBonusPage() {
  const [casinos, bonusTypes] = await Promise.all([listCasinos(), listBonusTypes()]);
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Adaugă bonus</h1>
        <p className="mt-1 text-sm text-ink-secondary">Devine accesibil public imediat după salvare.</p>
      </div>
      <BonusForm mode="create" action={createBonus} casinos={casinos} bonusTypes={bonusTypes} />
    </div>
  );
}
