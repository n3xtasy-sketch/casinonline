import { notFound } from "next/navigation";
import { RedirectForm } from "@/components/admin/RedirectForm";
import { getRedirectEdit } from "@/lib/db/admin-redirects";
import { updateRedirect } from "../../actions";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditRedirectPage({ params }: PageProps) {
  const { id } = await params;
  const row = await getRedirectEdit(id);
  if (!row) notFound();
  const action = updateRedirect.bind(null, row.id);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Editează redirect</h1>
        <p className="mt-1 text-sm text-ink-secondary">Modificările se aplică public în ≤ 60s.</p>
      </div>
      <RedirectForm mode="edit" action={action} initial={row} />
    </div>
  );
}
