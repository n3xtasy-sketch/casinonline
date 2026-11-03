"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createBriefFromClusterAction, createEmptyBriefAction } from "@/app/admin/(panel)/seo-research/[id]/briefs/brief-actions";
import type { ClusterChoice } from "@/lib/db/admin-seo-briefs";

export function BriefCreateControls({ projectId, clusters }: { projectId: string; clusters: ClusterChoice[] }) {
  const router = useRouter();
  const [clusterId, setClusterId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const available = clusters.filter((c) => !c.hasActiveBrief);

  const go = (id: string) => router.push(`/admin/seo-research/${projectId}/briefs/${id}`);

  const generate = () => {
    if (!clusterId) { setError("Alege un cluster."); return; }
    setError(null);
    start(async () => {
      const r = await createBriefFromClusterAction(projectId, clusterId);
      if ("error" in r) setError(r.error);
      else go(r.id);
    });
  };

  const empty = () => {
    setError(null);
    start(async () => {
      const r = await createEmptyBriefAction(projectId);
      if ("error" in r) setError(r.error);
      else go(r.id);
    });
  };

  return (
    <div className="flex flex-col gap-2 rounded-md border border-border bg-surface p-4">
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-ink-secondary">Generează brief din cluster</span>
          <select
            value={clusterId}
            onChange={(e) => setClusterId(e.target.value)}
            disabled={pending || !available.length}
            className="h-10 w-72 rounded-sm border border-border bg-field px-3 text-sm text-ink"
          >
            <option value="">{available.length ? "— alege cluster —" : "Niciun cluster fără brief activ"}</option>
            {available.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <button
          type="button"
          onClick={generate}
          disabled={pending || !clusterId}
          className="h-10 rounded-sm bg-accent px-4 text-sm font-semibold text-[#06110a] hover:bg-accent-hover disabled:opacity-50"
        >
          {pending ? "Se generează…" : "Generează brief"}
        </button>
        <button
          type="button"
          onClick={empty}
          disabled={pending}
          className="h-10 rounded-sm border border-border px-4 text-sm font-medium text-ink hover:bg-elevated disabled:opacity-50"
        >
          + Brief gol
        </button>
      </div>
      {clusters.some((c) => c.hasActiveBrief) ? (
        <p className="text-xs text-ink-muted">Clusterele cu brief activ sunt ascunse (un singur brief activ per cluster).</p>
      ) : null}
      {error ? <p role="alert" className="text-sm font-medium text-danger">{error}</p> : null}
    </div>
  );
}
