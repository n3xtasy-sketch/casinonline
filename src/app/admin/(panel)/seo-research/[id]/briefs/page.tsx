import Link from "next/link";
import { notFound } from "next/navigation";
import { getSeoProject } from "@/lib/db/admin-seo-research";
import { listBriefs, listClustersForBrief } from "@/lib/db/admin-seo-briefs";
import { briefStatusLabel, type BriefStatus } from "@/lib/brief-status";
import { BriefCreateControls } from "@/components/admin/BriefCreateControls";

export const metadata = { title: "Brief-uri SEO — Admin" };

interface PageProps { params: Promise<{ id: string }> }

function fmtDate(iso: string): string {
  const d = iso.slice(0, 10).split("-");
  return d.length === 3 ? `${d[2]}.${d[1]}.${d[0]}` : iso;
}

const TONE: Record<BriefStatus, string> = {
  draft: "bg-elevated text-ink-secondary",
  ready: "bg-gold/15 text-gold",
  approved: "bg-accent/12 text-accent",
  archived: "bg-elevated text-ink-muted",
};

export default async function BriefsPage({ params }: PageProps) {
  const { id } = await params;
  const project = await getSeoProject(id);
  if (!project) notFound();

  const [briefs, clusters] = await Promise.all([listBriefs(id), listClustersForBrief(id)]);
  const base = `/admin/seo-research/${id}`;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <Link href={base} className="text-[13px] text-ink-muted hover:text-ink-secondary">← {project.name}</Link>
        <h1 className="text-2xl font-bold text-ink">Brief-uri SEO</h1>
        <p className="max-w-[70ch] text-sm text-ink-secondary">
          Brief editorial generat determinist dintr-un cluster (keyword principal, secundare, intenție, URL țintă, H1,
          structură, entități, FAQ). Fără AI. Nicio publicare automată — brief-ul alimentează ulterior conținutul CMS.
        </p>
      </div>

      <BriefCreateControls projectId={id} clusters={clusters} />

      {briefs.length ? (
        <div className="overflow-x-auto rounded-md border border-border bg-surface">
          <table className="w-full min-w-[760px] text-sm">
            <thead><tr className="border-b border-border text-left text-xs uppercase tracking-wide text-ink-muted">
              <th className="px-4 py-2 font-semibold">Titlu</th>
              <th className="px-4 py-2 font-semibold">Cluster</th>
              <th className="px-4 py-2 font-semibold">Keyword principal</th>
              <th className="px-4 py-2 font-semibold">URL țintă</th>
              <th className="px-4 py-2 font-semibold">Intenție</th>
              <th className="px-4 py-2 font-semibold">Status</th>
              <th className="px-4 py-2 font-semibold">Actualizat</th>
              <th className="px-4 py-2" />
            </tr></thead>
            <tbody>
              {briefs.map((b) => (
                <tr key={b.id} className="border-b border-border/60 last:border-0">
                  <td className="px-4 py-2 font-medium text-ink">{b.title || "—"}</td>
                  <td className="px-4 py-2 text-ink-secondary">{b.clusterName ?? "—"}</td>
                  <td className="px-4 py-2 text-ink-secondary">{b.primaryKeyword || "—"}</td>
                  <td className="px-4 py-2 text-ink-muted">{b.targetUrl || "—"}</td>
                  <td className="px-4 py-2 text-ink-secondary">{b.intent || "—"}</td>
                  <td className="px-4 py-2"><span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${TONE[b.status]}`}>{briefStatusLabel(b.status)}</span></td>
                  <td className="px-4 py-2 text-ink-muted">{fmtDate(b.updatedAt)}</td>
                  <td className="px-4 py-2 text-right"><Link href={`${base}/briefs/${b.id}`} className="text-sm text-link hover:underline">editează</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="rounded-md border border-dashed border-border bg-surface p-6 text-center text-sm text-ink-muted">
          Niciun brief. Generează primul dintr-un cluster mai sus.
        </p>
      )}
    </div>
  );
}
