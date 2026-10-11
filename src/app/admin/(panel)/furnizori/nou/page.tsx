import { ProviderForm } from "@/components/admin/ProviderForm";
import { listProviderCategories } from "@/lib/db/admin-providers";
import { createProvider } from "../actions";

export default async function NewProviderPage() {
  const categories = await listProviderCategories();
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Adaugă furnizor</h1>
        <p className="mt-1 text-sm text-ink-secondary">Devine accesibil public imediat după salvare.</p>
      </div>
      <ProviderForm mode="create" action={createProvider} categories={categories} />
    </div>
  );
}
