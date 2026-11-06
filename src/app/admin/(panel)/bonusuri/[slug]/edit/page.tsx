import { notFound } from "next/navigation";
import { BonusForm } from "@/components/admin/BonusForm";
import {
  getBonusEdit,
  listCasinos,
  listBonusTypes,
  listAffiliateLinkChoices,
  listCasinoSlugs,
  listBonusTypeSlugs,
  listEvergreenPageChoices,
} from "@/lib/db/admin-bonuses";
import { listPublishedCategories } from "@/lib/db/seo-categories";
import { updateBonus, previewBonusCta } from "../../actions";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function EditBonusPage({ params }: PageProps) {
  const { slug } = await params;
  const [bonus, casinos, bonusTypes, affiliateLinks, casinoSlugs, bonusTypeSlugs, evergreenPages, bonusCategories] = await Promise.all([
    getBonusEdit(slug),
    listCasinos(),
    listBonusTypes(),
    listAffiliateLinkChoices(),
    listCasinoSlugs(),
    listBonusTypeSlugs(),
    listEvergreenPageChoices(),
    listPublishedCategories("bonus"),
  ]);
  if (!bonus) notFound();

  const action = updateBonus.bind(null, bonus.id);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Editează bonus: {bonus.offer}</h1>
        <p className="mt-1 text-sm text-ink-secondary">Modificările apar public imediat (updateTag).</p>
      </div>
      <BonusForm
        mode="edit"
        action={action}
        initial={bonus}
        casinos={casinos}
        bonusTypes={bonusTypes}
        affiliateLinks={affiliateLinks}
        casinoSlugs={casinoSlugs}
        previewAction={previewBonusCta}
        evergreenPages={evergreenPages}
        bonusTypeSlugs={bonusTypeSlugs}
        publishedBonusCategories={bonusCategories.map((c) => c.slug)}
      />
    </div>
  );
}
