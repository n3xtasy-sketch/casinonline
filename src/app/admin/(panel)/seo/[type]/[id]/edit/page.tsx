import { notFound } from "next/navigation";
import { SeoForm } from "@/components/admin/SeoForm";
import { getSeoEdit } from "@/lib/db/admin-seo";
import { SEO_TYPES, seoTypeLabel, type SeoType } from "@/lib/seo";
import { saveSeo, resetSeo } from "../../../actions";

interface PageProps {
  params: Promise<{ type: string; id: string }>;
}

export default async function EditSeoPage({ params }: PageProps) {
  const { type, id } = await params;
  if (!(SEO_TYPES as readonly string[]).includes(type)) notFound();
  const seoType = type as SeoType;

  const data = await getSeoEdit(seoType, id);
  if (!data) notFound();

  const action = saveSeo.bind(null, seoType, id);
  const reset = resetSeo.bind(null, seoType, id);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">SEO · {data.label}</h1>
          <p className="mt-1 text-sm text-ink-secondary">
            {seoTypeLabel(seoType)} · <span className="font-mono text-xs">{data.slug}</span>
          </p>
        </div>
        <form action={reset}>
          <button type="submit" className="h-9 rounded-sm border border-border px-3 text-sm font-medium text-ink-secondary hover:bg-elevated hover:text-ink">
            Reset la fallback
          </button>
        </form>
      </div>
      <SeoForm action={action} defaults={data.defaults} seo={data.seo} />
    </div>
  );
}
