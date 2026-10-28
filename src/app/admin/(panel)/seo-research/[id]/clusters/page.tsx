import Link from "next/link";
import { notFound } from "next/navigation";
import { getSeoProject } from "@/lib/db/admin-seo-research";
import { listClusters, loadClusterKeywords } from "@/lib/db/admin-seo-clusters";
import { ClusterWorkbench, type ClusterView, type KeywordView } from "@/components/admin/ClusterWorkbench";

export const metadata = { title: "Clustere — SEO Research — Admin" };

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ClustersPage({ params }: PageProps) {
  const { id } = await params;
  const project = await getSeoProject(id);
  if (!project) notFound();

  const [clusters, keywords] = await Promise.all([listClusters(id), loadClusterKeywords(id)]);

  const toView = (k: (typeof keywords)[number]): KeywordView => ({
    id: k.id,
    keyword: k.keyword,
    volume: k.volume,
    intent: k.intent,
    parentTopic: k.parentTopic,
    mappingStatus: k.mappingStatus,
    mappedUrl: k.mappedUrl,
    clusterId: k.clusterId,
  });

  const clusterViews: ClusterView[] = clusters.map((c) => ({
    id: c.id,
    name: c.name,
    intent: c.intent,
    primaryKeyword: c.primaryKeyword,
    keywords: keywords.filter((k) => k.clusterId === c.id).map(toView),
  }));
  const unassigned = keywords.filter((k) => !k.clusterId).map(toView);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <Link href={`/admin/seo-research/${id}`} className="text-[13px] text-ink-muted hover:text-ink-secondary">
          ← {project.name}
        </Link>
        <h1 className="text-2xl font-bold text-ink">Clustere de keyworduri</h1>
        <p className="max-w-[72ch] text-sm text-ink-secondary">
          Grupare asistată (nu automată): generează sugestii deterministe pe baza Parent Topic și a
          suprapunerii lexicale, apoi verifică, modifică și aplică doar ce selectezi. Scorul de încredere
          este euristic, nu o probabilitate statistică. Avertismentele de canibalizare sunt preliminare —
          validarea reală vine ulterior prin SERP Research și URL Mapping.
        </p>
      </div>

      <ClusterWorkbench projectId={id} clusters={clusterViews} unassigned={unassigned} />
    </div>
  );
}
