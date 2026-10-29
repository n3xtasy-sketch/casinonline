import Link from "next/link";
import { notFound } from "next/navigation";
import { getSeoProject } from "@/lib/db/admin-seo-research";
import { loadClustersForMapping } from "@/lib/db/admin-url-mapping";
import { buildUrlInventory } from "@/lib/db/url-inventory";
import { recommendUrls, detectUrlCannibalization } from "@/lib/seo/url-mapping";
import { UrlMappingWorkbench, type ClusterMappingView } from "@/components/admin/UrlMappingWorkbench";

export const metadata = { title: "URL Mapping — SEO Research — Admin" };

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function UrlMappingPage({ params }: PageProps) {
  const { id } = await params;
  const project = await getSeoProject(id);
  if (!project) notFound();

  const [clusters, inventory] = await Promise.all([loadClustersForMapping(id), buildUrlInventory()]);
  const recommendations = recommendUrls(clusters, inventory);
  const warnings = detectUrlCannibalization(clusters, inventory, recommendations);

  const clusterViews: ClusterMappingView[] = clusters.map((c) => ({
    id: c.id,
    name: c.name,
    primaryKeyword: c.primaryKeyword,
    keywords: c.keywords.map((k) => ({ id: k.id, keyword: k.keyword, mappedUrl: k.mappedUrl, mappingStatus: k.mappingStatus })),
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <Link href={`/admin/seo-research/${id}`} className="text-[13px] text-ink-muted hover:text-ink-secondary">← {project.name}</Link>
        <h1 className="text-2xl font-bold text-ink">URL Mapping & analiză preliminară de canibalizare</h1>
        <p className="max-w-[74ch] text-sm text-ink-secondary">
          Asociază clusterele cu URL-uri reale ale site-ului. Recomandările (folosește / extinde / pagină nouă /
          verifică) sunt euristice, deterministe — nu creează pagini și nu publică nimic. Avertismentele de
          canibalizare sunt preliminare, nu confirmate; validarea reală vine prin SERP Research și verificări live.
          Deciziile editoriale confirmate manual nu sunt niciodată suprascrise.
        </p>
      </div>

      <UrlMappingWorkbench
        projectId={id}
        clusters={clusterViews}
        recommendations={recommendations}
        inventory={inventory}
        warnings={warnings}
      />
    </div>
  );
}
