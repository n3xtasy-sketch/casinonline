import { BonusForm } from "@/components/admin/BonusForm";
import {
  listCasinos,
  listBonusTypes,
  listAffiliateLinkChoices,
  listCasinoSlugs,
} from "@/lib/db/admin-bonuses";
import { createBonus, previewBonusCta } from "../actions";

export default async function NewBonusPage() {
  const [casinos, bonusTypes, affiliateLinks, casinoSlugs] = await Promise.all([
    listCasinos(),
    listBonusTypes(),
    listAffiliateLinkChoices(),
    listCasinoSlugs(),
  ]);
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Adaugă bonus</h1>
        <p className="mt-1 text-sm text-ink-secondary">Devine accesibil public imediat după salvare.</p>
      </div>
      <BonusForm
        mode="create"
        action={createBonus}
        casinos={casinos}
        bonusTypes={bonusTypes}
        affiliateLinks={affiliateLinks}
        casinoSlugs={casinoSlugs}
        previewAction={previewBonusCta}
      />
    </div>
  );
}
