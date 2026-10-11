import { GuideForm } from "@/components/admin/GuideForm";
import { listGuideCategories } from "@/lib/db/admin-guides";
import { createGuide } from "../actions";

export default async function NewGuidePage() {
  const categories = await listGuideCategories();
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Adaugă ghid</h1>
        <p className="mt-1 text-sm text-ink-secondary">Devine accesibil public imediat după salvare.</p>
      </div>
      <GuideForm mode="create" action={createGuide} categories={categories} />
    </div>
  );
}
