import { notFound } from "next/navigation";
import { ProviderForm } from "@/components/admin/ProviderForm";
import { getProviderEdit, listProviderCategories } from "@/lib/db/admin-providers";
import { updateProvider } from "../../actions";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function EditProviderPage({ params }: PageProps) {
  const { slug } = await params;
  const [provider, categories] = await Promise.all([
    getProviderEdit(slug),
    listProviderCategories(),
  ]);
  if (!provider) notFound();

  const action = updateProvider.bind(null, provider.id);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Editează furnizor: {provider.name}</h1>
        <p className="mt-1 text-sm text-ink-secondary">Modificările apar public imediat (updateTag).</p>
      </div>
      <ProviderForm mode="edit" action={action} initial={provider} categories={categories} />
    </div>
  );
}
