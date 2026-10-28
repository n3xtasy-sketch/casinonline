"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  mapClusterUrlAction,
  removeClusterUrlAction,
  mapKeywordUrlAction,
} from "@/app/admin/(panel)/seo-research/[id]/url-mapping-actions";
import type { MappingRecommendation, Recommendation, UrlCannibalWarning } from "@/lib/seo/url-mapping";
import type { UrlEntry } from "@/lib/db/url-inventory";

export interface ClusterMappingView {
  id: string;
  name: string;
  primaryKeyword: string | null;
  keywords: { id: string; keyword: string; mappedUrl: string | null; mappingStatus: string }[];
}

const input = "h-9 rounded-sm border border-border bg-field px-2 text-sm text-ink outline-none focus-visible:border-accent";
const btn = "h-9 rounded-sm border border-border px-3 text-sm font-medium text-ink hover:bg-elevated disabled:opacity-50";
const btnPrimary = "h-9 rounded-sm bg-accent px-4 text-sm font-semibold text-[#06110a] hover:bg-accent-hover disabled:opacity-50";

type Tone = "accent" | "gold" | "danger" | "muted";
function Badge({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  const map = { accent: "bg-accent/12 text-accent", gold: "bg-gold/15 text-gold", danger: "bg-danger/15 text-danger", muted: "bg-elevated text-ink-secondary" } as const;
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${map[tone]}`}>{children}</span>;
}

const REC_LABEL: Record<Recommendation, { label: string; tone: Tone }> = {
  use_existing: { label: "Folosește pagina existentă", tone: "accent" },
  expand_existing: { label: "Extinde pagina existentă", tone: "gold" },
  create_new: { label: "Pagină nouă (planificată)", tone: "muted" },
  needs_review: { label: "Necesită verificare", tone: "danger" },
};
function statusTone(s: string): Tone {
  return s === "confirmed" ? "accent" : s === "suggested" ? "gold" : "muted";
}

// ── Recommendation + mapping card ────────────────────────────────────────────────

interface CardProps {
  rec: MappingRecommendation;
  cluster: ClusterMappingView;
  pending: boolean;
  onMap: (url: string, confirm: boolean) => void;
  onRemove: () => void;
  onClearKeyword: (keywordId: string) => void;
}

function MappingCard({ rec, cluster, pending, onMap, onRemove, onClearKeyword }: CardProps) {
  const [draft, setDraft] = useState(rec.currentUrl ?? rec.candidates[0]?.url ?? "");
  const [open, setOpen] = useState(false);
  const meta = REC_LABEL[rec.recommendation];
  const confirmed = rec.currentStatus === "confirmed";

  return (
    <div className="flex flex-col gap-3 rounded-md border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold text-ink">{cluster.name}</span>
        <Badge tone="muted">{cluster.keywords.length} kw</Badge>
        <Badge tone={meta.tone}>{meta.label}</Badge>
        {rec.needsReview ? <Badge tone="gold">verifică</Badge> : null}
        {rec.currentUrl ? <Badge tone={statusTone(rec.currentStatus)}>mapat: {rec.currentUrl} ({rec.currentStatus})</Badge> : <Badge tone="muted">nemapat</Badge>}
      </div>

      <p className="text-sm text-ink-secondary">{rec.explanation}</p>

      {rec.recommendation === "create_new" && rec.suggestedSlug ? (
        <p className="text-xs text-ink-muted">Slug propus: <code className="rounded bg-elevated px-1">{rec.suggestedSlug}</code> (pagina nu se creează automat).</p>
      ) : null}

      {rec.candidates.length ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-ink-muted">Candidați:</span>
          {rec.candidates.map((c) => (
            <button key={c.url} type="button" onClick={() => setDraft(c.url)} className="rounded-full border border-border px-2 py-0.5 text-xs text-ink-secondary hover:bg-elevated" title={`${Math.round(c.score * 100)}% · ${c.type}`}>
              {c.title} <span className="text-ink-muted">({Math.round(c.score * 100)}%)</span>
            </button>
          ))}
        </div>
      ) : null}

      {confirmed ? (
        <p className="rounded-sm border border-accent/40 bg-accent/5 p-2 text-xs text-ink-secondary">
          Mapare confirmată manual — protejată. Editează per-keyword mai jos dacă vrei să o schimbi.
        </p>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="/cazinouri-online/..." className={`${input} w-72`} />
          <button type="button" disabled={pending || !draft.trim()} className={btn} onClick={() => onMap(draft.trim(), false)}>Salvează (sugerat)</button>
          <button type="button" disabled={pending || !draft.trim()} className={btnPrimary} onClick={() => onMap(draft.trim(), true)}>Confirmă</button>
          {rec.currentUrl ? <button type="button" disabled={pending} className="h-9 px-2 text-sm text-danger hover:underline disabled:opacity-50" onClick={onRemove}>Elimină</button> : null}
        </div>
      )}

      <button type="button" className="self-start text-xs text-ink-secondary hover:text-ink" onClick={() => setOpen((o) => !o)}>
        {open ? "ascunde keywordurile" : `vezi/editează mapping per-keyword (${cluster.keywords.length})`}
      </button>
      {open ? (
        <div className="overflow-x-auto rounded-sm border border-border/70">
          <table className="w-full min-w-[520px] text-sm">
            <tbody>
              {cluster.keywords.map((k) => (
                <tr key={k.id} className="border-b border-border/50 last:border-0">
                  <td className="px-3 py-1.5 font-medium text-ink">{k.keyword}</td>
                  <td className="px-3 py-1.5 text-ink-muted">{k.mappedUrl ?? "—"}</td>
                  <td className="px-3 py-1.5"><Badge tone={statusTone(k.mappingStatus)}>{k.mappingStatus}</Badge></td>
                  <td className="px-3 py-1.5 text-right">
                    {k.mappedUrl ? <button type="button" disabled={pending} className="text-xs text-ink-muted hover:text-danger" onClick={() => onClearKeyword(k.id)}>golește</button> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}

// ── Workbench ──────────────────────────────────────────────────────────────────────

export function UrlMappingWorkbench({
  projectId,
  clusters,
  recommendations,
  inventory,
  warnings,
}: {
  projectId: string;
  clusters: ClusterMappingView[];
  recommendations: MappingRecommendation[];
  inventory: UrlEntry[];
  warnings: UrlCannibalWarning[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [showInv, setShowInv] = useState(false);

  const byId = useMemo(() => new Map(clusters.map((c) => [c.id, c])), [clusters]);
  const sortedRecs = useMemo(
    () => [...recommendations].sort((a, b) => Number(b.needsReview) - Number(a.needsReview) || (byId.get(a.clusterId)?.name ?? "").localeCompare(byId.get(b.clusterId)?.name ?? "")),
    [recommendations, byId],
  );
  const invFiltered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (s ? inventory.filter((e) => e.url.toLowerCase().includes(s) || e.title.toLowerCase().includes(s)) : inventory).slice(0, 300);
  }, [inventory, q]);

  function act(fn: () => Promise<{ error?: string } | unknown>, ok?: (r: unknown) => void) {
    setErr(null); setMsg(null);
    start(async () => {
      const r = (await fn()) as { error?: string } | undefined;
      if (r && typeof r === "object" && "error" in r && r.error) { setErr(r.error); return; }
      ok?.(r);
      router.refresh();
    });
  }

  if (!clusters.length)
    return <p className="rounded-md border border-dashed border-border bg-surface p-8 text-center text-sm text-ink-muted">Niciun cluster încă. Creează clustere în pagina Clustere de keyworduri înainte de mapare.</p>;

  return (
    <div className="flex flex-col gap-8">
      {err ? <p role="alert" className="text-sm font-medium text-danger">{err}</p> : null}
      {msg ? <p className="rounded-md border border-accent/40 bg-accent/5 p-3 text-sm text-ink">{msg}</p> : null}

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-ink">Recomandări & mapare per cluster ({recommendations.length})</h2>
        {sortedRecs.map((rec) => {
          const cluster = byId.get(rec.clusterId);
          if (!cluster) return null;
          return (
            <MappingCard
              key={rec.clusterId}
              rec={rec}
              cluster={cluster}
              pending={pending}
              onMap={(url, confirm) => act(() => mapClusterUrlAction(projectId, rec.clusterId, url, confirm), (r) => {
                const res = r as { updated?: number; skipped?: number };
                setMsg(`${res.updated ?? 0} keyworduri mapate${res.skipped ? ` · ${res.skipped} confirmate păstrate` : ""}.`);
              })}
              onRemove={() => act(() => removeClusterUrlAction(projectId, rec.clusterId))}
              onClearKeyword={(kid) => act(() => mapKeywordUrlAction(projectId, kid, null, false))}
            />
          );
        })}
      </section>

      {warnings.length ? (
        <section className="flex flex-col gap-1 rounded-md border border-gold/40 bg-gold/5 p-4">
          <p className="text-sm font-semibold text-ink">Avertismente preliminare de canibalizare ({warnings.length})</p>
          <p className="text-xs text-ink-muted">Euristice — nu canibalizare confirmată. Validare reală ulterior (SERP + verificări live).</p>
          <ul className="mt-1 flex flex-col gap-1 text-sm text-ink-secondary">
            {warnings.map((w, i) => (
              <li key={i} className="flex items-start gap-2">
                <Badge tone={w.severity === "medium" ? "gold" : "muted"}>{w.severity}</Badge>
                <span>{w.message}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-ink">Inventar URL ({inventory.length})</h2>
          <button type="button" className="text-xs text-ink-secondary hover:text-ink" onClick={() => setShowInv((s) => !s)}>{showInv ? "ascunde" : "arată"}</button>
        </div>
        {showInv ? (
          <>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Caută URL sau titlu…" className={`${input} w-72`} />
            <div className="max-h-96 overflow-y-auto rounded-md border border-border bg-surface">
              <table className="w-full min-w-[640px] text-sm">
                <thead><tr className="border-b border-border text-left text-xs uppercase tracking-wide text-ink-muted">
                  <th className="px-3 py-2 font-semibold">URL</th><th className="px-3 py-2 font-semibold">Tip</th>
                  <th className="px-3 py-2 font-semibold">Titlu</th><th className="px-3 py-2 font-semibold">Sursă</th><th className="px-3 py-2 font-semibold">Status</th>
                </tr></thead>
                <tbody>
                  {invFiltered.map((e) => (
                    <tr key={e.url} className="border-b border-border/50 last:border-0">
                      <td className="px-3 py-1.5 font-medium text-ink">{e.url}</td>
                      <td className="px-3 py-1.5 text-ink-muted">{e.type}</td>
                      <td className="px-3 py-1.5 text-ink-secondary">{e.title}</td>
                      <td className="px-3 py-1.5 text-ink-muted">{e.source}</td>
                      <td className="px-3 py-1.5"><Badge tone={e.status === "existing" ? "accent" : "muted"}>{e.status === "existing" ? "existent" : "planificat"}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {inventory.length > invFiltered.length ? <p className="text-xs text-ink-muted">Se afișează {invFiltered.length} din {inventory.length}. Rafinează căutarea.</p> : null}
          </>
        ) : null}
      </section>
    </div>
  );
}
