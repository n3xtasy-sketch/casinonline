import Link from "next/link";
import { notFound } from "next/navigation";
import { getSeoProject, getSeoProjectStats } from "@/lib/db/admin-seo-research";

export const metadata = { title: "Proiect SEO Research — Admin" };

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function SeoProjectPage({ params }: PageProps) {
  const { id } = await params;
  const project = await getSeoProject(id);
  if (!project) notFound();
  const stats = await getSeoProjectStats(id);

  const indicators = [
    { label: "Keyworduri", value: stats.keywords },
    { label: "Clustere", value: stats.clusters },
    { label: "Importuri", value: stats.imports },
    { label: "Brief-uri", value: stats.briefs },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <Link href="/admin/seo-research" className="text-[13px] text-ink-muted hover:text-ink-secondary">
          ← SEO Research
        </Link>
        <h1 className="text-2xl font-bold text-ink">{project.name}</h1>
        <p className="text-sm text-ink-secondary">Țară implicită: {project.defaultCountry.toUpperCase()}</p>
      </div>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {indicators.map((i) => (
          <div key={i.label} className="rounded-md border border-border bg-surface p-4">
            <div className="text-2xl font-bold tabular-nums text-ink">{i.value}</div>
            <div className="mt-0.5 text-xs text-ink-muted">{i.label}</div>
          </div>
        ))}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-ink">Keyworduri</h2>
        <div className="rounded-md border border-dashed border-border bg-surface p-8 text-center text-sm text-ink-muted">
          Niciun keyword încă. Importul CSV Ahrefs devine disponibil în etapa următoare (5.1C).
          <div className="mt-3">
            <button
              type="button"
              disabled
              className="h-9 cursor-not-allowed rounded-sm border border-border px-4 text-sm font-medium text-ink-muted opacity-60"
              title="Disponibil în FAZA 5.1C"
            >
              Import CSV (în curând)
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
