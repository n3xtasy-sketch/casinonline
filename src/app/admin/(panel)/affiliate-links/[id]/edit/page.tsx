import { notFound } from "next/navigation";
import { AffiliateLinkForm } from "@/components/admin/AffiliateLinkForm";
import { getAffiliateLinkEdit, listAllCasinos } from "@/lib/db/admin-affiliates";
import { updateAffiliateLink } from "../../actions";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditAffiliateLinkPage({ params }: PageProps) {
  const { id } = await params;
  const [link, casinos] = await Promise.all([getAffiliateLinkEdit(id), listAllCasinos()]);
  if (!link) notFound();

  const action = updateAffiliateLink.bind(null, link.id);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Editează link afiliat</h1>
        <p className="mt-1 text-sm text-ink-secondary">Modificările se aplică imediat (/go e live).</p>
      </div>
      <AffiliateLinkForm mode="edit" action={action} initial={link} casinos={casinos} />
    </div>
  );
}
