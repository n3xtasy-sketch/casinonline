import { listSeoProjects } from "@/lib/db/admin-seo-research";
import { ContentStudio } from "@/components/admin/ContentStudio";

export const metadata = { title: "AI Content Studio — Admin" };

/**
 * AI-3B.1 — raise the Server-Action timeout for this route only (Article Engine generates sections
 * sequentially). 60s is the maximum configurable value on the Vercel Hobby plan (effective only when
 * Fluid Compute is enabled for the project). It covers a realistic 2-section run (~10–30s) with overhead;
 * it does NOT guarantee the absolute worst case (2 sections each hitting the 30s adapter timeout) nor
 * 8–12-section articles — those would need a Pro plan (up to 300s) or chunked generation.
 */
export const maxDuration = 60;

export default async function ContentStudioPage() {
  const projects = await listSeoProjects();
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-ink">AI Content Studio</h1>
        <p className="max-w-[72ch] text-sm text-ink-secondary">
          Generează o secțiune SEO dintr-un brief real, pe baza datelor verificate din CMS. Conținutul este
          editabil și NU se salvează automat — integrarea cu CMS (draft) + istoricul vin ulterior.
        </p>
      </div>
      <ContentStudio projects={projects.map((p) => ({ id: p.id, name: p.name }))} />
    </div>
  );
}
