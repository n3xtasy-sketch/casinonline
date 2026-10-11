import { notFound } from "next/navigation";
import { GuideForm } from "@/components/admin/GuideForm";
import { getGuideEdit, listGuideCategories } from "@/lib/db/admin-guides";
import { updateGuide } from "../../actions";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function EditGuidePage({ params }: PageProps) {
  const { slug } = await params;
  const [guide, categories] = await Promise.all([getGuideEdit(slug), listGuideCategories()]);
  if (!guide) notFound();

  const action = updateGuide.bind(null, guide.id);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Editează ghid: {guide.title}</h1>
        <p className="mt-1 text-sm text-ink-secondary">Modificările apar public imediat (updateTag).</p>
      </div>
      <GuideForm mode="edit" action={action} initial={guide} categories={categories} />
    </div>
  );
}
