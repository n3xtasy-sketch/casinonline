import Link from "next/link";
import { notFound } from "next/navigation";
import { getSeoProject } from "@/lib/db/admin-seo-research";
import { getBriefById } from "@/lib/db/admin-seo-briefs";
import { buildUrlInventory } from "@/lib/db/url-inventory";
import { BriefEditor } from "@/components/admin/BriefEditor";

export const metadata = { title: "Editează brief SEO — Admin" };

interface PageProps { params: Promise<{ id: string; briefId: string }> }

export default async function BriefEditorPage({ params }: PageProps) {
  const { id, briefId } = await params;
  const [project, brief] = await Promise.all([getSeoProject(id), getBriefById(id, briefId)]);
  if (!project || !brief) notFound();

  const inventory = await buildUrlInventory();
  const urls = inventory.map((e) => ({ url: e.url, title: e.title, status: e.status }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <Link href={`/admin/seo-research/${id}/briefs`} className="text-[13px] text-ink-muted hover:text-ink-secondary">← Brief-uri</Link>
        <h1 className="text-2xl font-bold text-ink">{brief.title || "Brief"}</h1>
        <p className="text-sm text-ink-secondary">{project.name}{brief.clusterName ? ` · cluster: ${brief.clusterName}` : ""}</p>
      </div>
      {/* key on (id:updatedAt) → remount + re-init from the fresh snapshot after a regenerate
          (router.refresh brings a newer updated_at). Save/transition keep local state (no refresh). */}
      <BriefEditor key={`${brief.id}:${brief.updatedAt}`} projectId={id} initial={brief} urls={urls} />
    </div>
  );
}
