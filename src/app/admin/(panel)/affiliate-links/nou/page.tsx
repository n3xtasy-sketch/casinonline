import { AffiliateLinkForm } from "@/components/admin/AffiliateLinkForm";
import { listAllCasinos } from "@/lib/db/admin-affiliates";
import { createAffiliateLink } from "../actions";

export default async function NewAffiliateLinkPage() {
  const casinos = await listAllCasinos();
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Adaugă link afiliat</h1>
        <p className="mt-1 text-sm text-ink-secondary">
          Un link activ per cazino + placement + campanie.
        </p>
      </div>
      <AffiliateLinkForm mode="create" action={createAffiliateLink} casinos={casinos} />
    </div>
  );
}
