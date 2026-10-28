"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  generateSuggestionsAction,
  applySuggestionsAction,
  createClusterAction,
  renameClusterAction,
  setClusterPrimaryAction,
  deleteClusterAction,
  assignKeywordsAction,
  type SuggestionsResult,
  type ApplyGroup,
} from "@/app/admin/(panel)/seo-research/[id]/cluster-actions";

export interface KeywordView {
  id: string;
  keyword: string;
  volume: number | null;
  intent: string | null;
  parentTopic: string | null;
  mappingStatus: string;
  mappedUrl: string | null;
  clusterId: string | null;
}

export interface ClusterView {
  id: string;
  name: string;
  intent: string | null;
  primaryKeyword: string | null;
  keywords: KeywordView[];
}

const INTENTS = ["", "informational", "commercial", "transactional", "navigational"];
const input = "h-9 rounded-sm border border-border bg-field px-2 text-sm text-ink outline-none focus-visible:border-accent";
const btn = "h-9 rounded-sm border border-border px-3 text-sm font-medium text-ink hover:bg-elevated disabled:opacity-50";
const btnPrimary = "h-9 rounded-sm bg-accent px-4 text-sm font-semibold text-[#06110a] hover:bg-accent-hover disabled:opacity-50";

function Badge({ tone, children }: { tone: "accent" | "gold" | "danger" | "muted"; children: React.ReactNode }) {
  const map = {
    accent: "bg-accent/12 text-accent",
    gold: "bg-gold/15 text-gold",
    danger: "bg-danger/15 text-danger",
    muted: "bg-elevated text-ink-secondary",
  } as const;
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${map[tone]}`}>{children}</span>;
}

function ConfidenceBadge({ value }: { value: number }) {
  const tone = value >= 75 ? "accent" : value >= 55 ? "gold" : "danger";
  return <Badge tone={tone}>Încredere euristică: {value}</Badge>;
}

function kwLabel(k: { keyword: string; volume: number | null }): string {
  return k.volume != null ? `${k.keyword} · ${k.volume}` : k.keyword;
}

// ── Suggestion card ──────────────────────────────────────────────────────────────

interface CardProps {
  run: SuggestionsResult;
  suggestionId: string;
  selected: boolean;
  name: string;
  primaryId: string;
  excluded: Record<string, boolean>;
  onToggleSelect: () => void;
  onName: (v: string) => void;
  onPrimary: (id: string) => void;
  onExclude: (id: string) => void;
}

function SuggestionCard(props: CardProps) {
  const { run, suggestionId, selected, name, primaryId, excluded } = props;
  const s = run.suggestions.find((x) => x.id === suggestionId)!;
  const members = s.keywordIds.map((id) => ({ id, ...run.keywordMap[id] })).filter((m) => m.keyword);
  const remaining = members.filter((m) => !excluded[m.id]);

  return (
    <div className={`flex flex-col gap-3 rounded-md border p-4 ${selected ? "border-accent/50 bg-accent/5" : "border-border bg-surface"}`}>
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 text-sm font-medium text-ink">
          <input type="checkbox" checked={selected} onChange={props.onToggleSelect} />
          Selectează
        </label>
        <ConfidenceBadge value={s.confidence} />
        <Badge tone="muted">{s.method === "parent_topic" ? "Parent Topic" : s.method === "hybrid" ? "Hibrid" : "Lexical"}</Badge>
        {s.needsReview ? <Badge tone="gold">Necesită verificare</Badge> : null}
        {s.needsSerpValidation ? <Badge tone="muted">Validare SERP ulterior</Badge> : null}
        {s.intent ? <Badge tone="muted">Intenție: {s.intent}</Badge> : null}
      </div>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-xs font-medium text-ink-secondary">Nume cluster</span>
        <input value={name} onChange={(e) => props.onName(e.target.value)} className={`${input} w-full max-w-md`} />
      </label>

      {s.reasons.length ? (
        <ul className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-ink-muted">
          {s.reasons.map((r) => <li key={r}>• {r}</li>)}
        </ul>
      ) : null}

      <div className="overflow-x-auto rounded-sm border border-border/70">
        <table className="w-full min-w-[480px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-ink-muted">
              <th className="px-3 py-1.5 font-semibold">Principal</th>
              <th className="px-3 py-1.5 font-semibold">Keyword</th>
              <th className="px-3 py-1.5 font-semibold">Volume</th>
              <th className="px-3 py-1.5 font-semibold">Parent</th>
              <th className="px-3 py-1.5 font-semibold" />
            </tr>
          </thead>
          <tbody>
            {members.map((m) => {
              const isExcluded = Boolean(excluded[m.id]);
              return (
                <tr key={m.id} className={`border-b border-border/50 last:border-0 ${isExcluded ? "opacity-40" : ""}`}>
                  <td className="px-3 py-1.5">
                    <input
                      type="radio"
                      name={`primary-${s.id}`}
                      checked={primaryId === m.id}
                      disabled={isExcluded}
                      onChange={() => props.onPrimary(m.id)}
                    />
                  </td>
                  <td className="px-3 py-1.5 font-medium text-ink">{m.keyword}</td>
                  <td className="px-3 py-1.5 tabular-nums text-ink-secondary">{m.volume ?? "—"}</td>
                  <td className="px-3 py-1.5 text-ink-muted">{m.parentTopic || "—"}</td>
                  <td className="px-3 py-1.5 text-right">
                    <button type="button" onClick={() => props.onExclude(m.id)} className="text-xs text-ink-muted hover:text-danger">
                      {isExcluded ? "readaugă" : "scoate"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-ink-muted">{remaining.length} keyworduri vor fi atribuite la aplicare.</p>
    </div>
  );
}

// ── Existing cluster row ──────────────────────────────────────────────────────────

interface ClusterRowProps {
  projectId: string;
  cluster: ClusterView;
  others: ClusterView[];
  pending: boolean;
  onAction: (fn: () => Promise<{ error?: string } | unknown>) => void;
}

function ExistingCluster({ projectId, cluster, others, pending, onAction }: ClusterRowProps) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(cluster.name);
  const router = useRouter();

  return (
    <div className="flex flex-col gap-2 rounded-md border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {editing ? (
            <>
              <input value={name} onChange={(e) => setName(e.target.value)} className={`${input} w-56`} />
              <button
                type="button"
                disabled={pending}
                className={btn}
                onClick={() => onAction(async () => {
                  const r = await renameClusterAction(projectId, cluster.id, name);
                  if (!("error" in r)) { setEditing(false); router.refresh(); }
                  return r;
                })}
              >
                Salvează
              </button>
              <button type="button" className={btn} onClick={() => { setName(cluster.name); setEditing(false); }}>Anulează</button>
            </>
          ) : (
            <>
              <span className="font-semibold text-ink">{cluster.name}</span>
              <Badge tone="muted">{cluster.keywords.length} kw</Badge>
              {cluster.intent ? <Badge tone="muted">{cluster.intent}</Badge> : null}
              <button type="button" className="text-xs text-ink-muted hover:text-ink" onClick={() => setEditing(true)}>redenumește</button>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button type="button" className="text-xs text-ink-secondary hover:text-ink" onClick={() => setOpen((o) => !o)}>
            {open ? "ascunde" : "vezi keyworduri"}
          </button>
          <button
            type="button"
            disabled={pending}
            className="text-xs text-danger hover:underline disabled:opacity-50"
            onClick={() => {
              if (!confirm(`Ștergi clusterul „${cluster.name}"? Keywordurile NU se șterg, doar se detașează.`)) return;
              onAction(async () => { const r = await deleteClusterAction(projectId, cluster.id); if (!("error" in r)) router.refresh(); return r; });
            }}
          >
            șterge cluster
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs text-ink-muted">
        <span>Principal:</span>
        <select
          defaultValue={cluster.primaryKeyword ?? ""}
          disabled={pending || !cluster.keywords.length}
          className={`${input} h-8 max-w-xs`}
          onChange={(e) => onAction(async () => { const r = await setClusterPrimaryAction(projectId, cluster.id, e.target.value || null); if (!("error" in r)) router.refresh(); return r; })}
        >
          <option value="">— niciunul —</option>
          {cluster.keywords.map((k) => <option key={k.id} value={k.keyword}>{k.keyword}</option>)}
        </select>
      </div>

      {open ? (
        cluster.keywords.length ? (
          <div className="overflow-x-auto rounded-sm border border-border/70">
            <table className="w-full min-w-[520px] text-sm">
              <tbody>
                {cluster.keywords.map((k) => (
                  <tr key={k.id} className="border-b border-border/50 last:border-0">
                    <td className="px-3 py-1.5 font-medium text-ink">{kwLabel(k)}</td>
                    <td className="px-3 py-1.5 text-ink-muted">{k.mappingStatus !== "none" ? `URL: ${k.mappingStatus}` : ""}</td>
                    <td className="px-3 py-1.5 text-right">
                      <select
                        defaultValue=""
                        disabled={pending}
                        className={`${input} h-8`}
                        onChange={(e) => {
                          const v = e.target.value;
                          onAction(async () => { const r = await assignKeywordsAction(projectId, [k.id], v === "__remove__" ? null : v); if (!("error" in r)) router.refresh(); return r; });
                        }}
                      >
                        <option value="" disabled>mută…</option>
                        <option value="__remove__">— scoate din cluster —</option>
                        {others.map((o) => <option key={o.id} value={o.id}>→ {o.name}</option>)}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs text-ink-muted">Niciun keyword în acest cluster.</p>
        )
      ) : null}
    </div>
  );
}

// ── Workbench ──────────────────────────────────────────────────────────────────────

export function ClusterWorkbench({ projectId, clusters, unassigned }: { projectId: string; clusters: ClusterView[]; unassigned: KeywordView[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  // Suggestions state.
  const [run, setRun] = useState<SuggestionsResult | null>(null);
  const [sel, setSel] = useState<Record<string, boolean>>({});
  const [names, setNames] = useState<Record<string, string>>({});
  const [primaries, setPrimaries] = useState<Record<string, string>>({});
  const [excluded, setExcluded] = useState<Record<string, Record<string, boolean>>>({});
  const [applyMsg, setApplyMsg] = useState<string | null>(null);

  // Manual-create state.
  const [newName, setNewName] = useState("");
  const [newIntent, setNewIntent] = useState("");

  // Unassigned-assignment state.
  const [picked, setPicked] = useState<Record<string, boolean>>({});
  const [target, setTarget] = useState("");

  const selectedCount = useMemo(() => Object.values(sel).filter(Boolean).length, [sel]);

  function runAction(fn: () => Promise<{ error?: string } | unknown>) {
    setErr(null);
    start(async () => {
      const r = (await fn()) as { error?: string } | undefined;
      if (r && typeof r === "object" && "error" in r && r.error) setErr(r.error);
    });
  }

  function generate() {
    setErr(null); setApplyMsg(null);
    start(async () => {
      const res = await generateSuggestionsAction(projectId);
      if ("error" in res) { setErr(res.error); return; }
      setRun(res);
      const s0: Record<string, boolean> = {}, n0: Record<string, string> = {}, p0: Record<string, string> = {};
      for (const s of res.suggestions) { s0[s.id] = false; n0[s.id] = s.suggestedName; p0[s.id] = s.primaryKeywordId; }
      setSel(s0); setNames(n0); setPrimaries(p0); setExcluded({});
    });
  }

  function applySelected() {
    if (!run) return;
    const groups: ApplyGroup[] = run.suggestions
      .filter((s) => sel[s.id])
      .map((s) => {
        const ex = excluded[s.id] ?? {};
        const keywordIds = s.keywordIds.filter((id) => !ex[id]);
        const primaryId = primaries[s.id];
        const primaryKeyword = (keywordIds.includes(primaryId) ? run.keywordMap[primaryId]?.keyword : run.keywordMap[keywordIds[0]]?.keyword) ?? null;
        return { name: names[s.id] ?? s.suggestedName, intent: s.intent, primaryKeyword, keywordIds };
      })
      .filter((g) => g.keywordIds.length);
    if (!groups.length) { setErr("Selectează cel puțin o sugestie cu keyworduri."); return; }
    setErr(null);
    start(async () => {
      const res = await applySuggestionsAction(projectId, groups);
      if ("error" in res) { setErr(res.error); return; }
      setApplyMsg(`${res.clustersCreated} clustere create · ${res.keywordsAssigned} keyworduri atribuite${res.keywordsSkipped ? ` · ${res.keywordsSkipped} sărite (deja atribuite)` : ""}.`);
      setRun(null);
      router.refresh();
    });
  }

  const pickedIds = Object.keys(picked).filter((id) => picked[id]);

  return (
    <div className="flex flex-col gap-8">
      {err ? <p role="alert" className="text-sm font-medium text-danger">{err}</p> : null}

      {/* 1. Suggestions workflow */}
      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-ink">Sugestii de clustering</h2>
          <button type="button" disabled={pending} className={btn} onClick={generate}>
            {pending && !run ? "Se generează…" : "Generează sugestii"}
          </button>
        </div>

        {applyMsg ? <p className="rounded-md border border-accent/40 bg-accent/5 p-3 text-sm text-ink">{applyMsg}</p> : null}

        {run ? (
          run.suggestions.length ? (
            <>
              <p className="text-xs text-ink-muted">
                {run.suggestions.length} sugestii afișate (din {run.suggestionsTotal} găsite) · {run.considered} keyworduri analizate · {run.ungrouped} keyworduri negrupate.
              </p>
              {run.suggestionsTruncated > 0 ? (
                <p className="rounded-md border border-gold/40 bg-gold/5 p-2 text-xs text-ink-secondary">
                  Au fost afișate primele {run.suggestions.length} de sugestii. Alte {run.suggestionsTruncated} sugestii nu au fost incluse din cauza limitei v1. Aplică/atribuie cele curente, apoi regenerează pentru restul.
                </p>
              ) : null}
              {run.truncated > 0 ? (
                <p className="rounded-md border border-gold/40 bg-gold/5 p-2 text-xs text-ink-secondary">
                  {run.truncated} keyworduri nu au fost procesate (limită de {run.considered} keyworduri pe rulare; s-au păstrat cele cu volum mai mare). Diferit de cele {run.ungrouped} negrupate.
                </p>
              ) : null}
              <div className="flex flex-col gap-3">
                {run.suggestions.map((s) => (
                  <SuggestionCard
                    key={s.id}
                    run={run}
                    suggestionId={s.id}
                    selected={Boolean(sel[s.id])}
                    name={names[s.id] ?? s.suggestedName}
                    primaryId={primaries[s.id] ?? s.primaryKeywordId}
                    excluded={excluded[s.id] ?? {}}
                    onToggleSelect={() => setSel((m) => ({ ...m, [s.id]: !m[s.id] }))}
                    onName={(v) => setNames((m) => ({ ...m, [s.id]: v }))}
                    onPrimary={(id) => setPrimaries((m) => ({ ...m, [s.id]: id }))}
                    onExclude={(id) => setExcluded((m) => ({ ...m, [s.id]: { ...(m[s.id] ?? {}), [id]: !(m[s.id] ?? {})[id] } }))}
                  />
                ))}
              </div>
              <div className="flex items-center gap-3">
                <button type="button" disabled={pending || selectedCount === 0} className={btnPrimary} onClick={applySelected}>
                  {pending ? "Se aplică…" : `Aplică ${selectedCount} sugestii selectate`}
                </button>
                <span className="text-xs text-ink-muted">Nicio sugestie nu se aplică automat — doar cele bifate.</span>
              </div>
            </>
          ) : (
            <p className="rounded-md border border-dashed border-border bg-surface p-6 text-center text-sm text-ink-muted">
              Nicio sugestie nouă. Fie keywordurile sunt deja grupate, fie nu au suprapuneri suficiente pentru v1.
            </p>
          )
        ) : null}

        {run?.warnings.length ? (
          <div className="flex flex-col gap-1 rounded-md border border-gold/40 bg-gold/5 p-4">
            <p className="text-sm font-semibold text-ink">Avertismente preliminare de canibalizare ({run.warnings.length})</p>
            <p className="text-xs text-ink-muted">Euristice — nu dovezi. Validare reală prin SERP Research + URL Mapping.</p>
            <ul className="mt-1 flex flex-col gap-1 text-sm text-ink-secondary">
              {run.warnings.map((w, i) => (
                <li key={i} className="flex items-start gap-2">
                  <Badge tone={w.severity === "medium" ? "gold" : "muted"}>{w.severity}</Badge>
                  <span>{w.message}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      {/* 2. Existing clusters */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-ink">Clustere ({clusters.length})</h2>
        <form
          className="flex flex-wrap items-end gap-2 rounded-md border border-border bg-surface p-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!newName.trim()) { setErr("Numele clusterului este obligatoriu."); return; }
            runAction(async () => { const r = await createClusterAction(projectId, newName, newIntent || null); if (!("error" in r)) { setNewName(""); setNewIntent(""); router.refresh(); } return r; });
          }}
        >
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-medium text-ink-secondary">Cluster nou (manual)</span>
            <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="ex. Book of Ra" className={`${input} w-56`} />
          </label>
          <select value={newIntent} onChange={(e) => setNewIntent(e.target.value)} className={input}>
            {INTENTS.map((i) => <option key={i} value={i}>{i || "intenție (opțional)"}</option>)}
          </select>
          <button type="submit" disabled={pending} className={btn}>Creează cluster</button>
        </form>

        {clusters.length ? (
          <div className="flex flex-col gap-2">
            {clusters.map((c) => (
              <ExistingCluster key={c.id} projectId={projectId} cluster={c} others={clusters.filter((o) => o.id !== c.id)} pending={pending} onAction={runAction} />
            ))}
          </div>
        ) : (
          <p className="rounded-md border border-dashed border-border bg-surface p-6 text-center text-sm text-ink-muted">
            Niciun cluster încă. Generează sugestii mai sus sau creează unul manual.
          </p>
        )}
      </section>

      {/* 3. Unassigned keywords */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-ink">Keyworduri neatribuite ({unassigned.length})</h2>
        {unassigned.length ? (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <select value={target} onChange={(e) => setTarget(e.target.value)} className={input} disabled={!clusters.length}>
                <option value="">alege clusterul țintă…</option>
                {clusters.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <button
                type="button"
                disabled={pending || !target || pickedIds.length === 0}
                className={btn}
                onClick={() => runAction(async () => { const r = await assignKeywordsAction(projectId, pickedIds, target); if (!("error" in r)) { setPicked({}); router.refresh(); } return r; })}
              >
                Adaugă {pickedIds.length || ""} în cluster
              </button>
            </div>
            <div className="max-h-96 overflow-y-auto rounded-md border border-border bg-surface">
              <table className="w-full min-w-[520px] text-sm">
                <tbody>
                  {unassigned.slice(0, 500).map((k) => (
                    <tr key={k.id} className="border-b border-border/50 last:border-0">
                      <td className="w-8 px-3 py-1.5">
                        <input type="checkbox" checked={Boolean(picked[k.id])} onChange={() => setPicked((m) => ({ ...m, [k.id]: !m[k.id] }))} />
                      </td>
                      <td className="px-3 py-1.5 font-medium text-ink">{k.keyword}</td>
                      <td className="px-3 py-1.5 tabular-nums text-ink-secondary">{k.volume ?? "—"}</td>
                      <td className="px-3 py-1.5 text-ink-muted">{k.intent || "—"}</td>
                      <td className="px-3 py-1.5 text-ink-muted">{k.parentTopic || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {unassigned.length > 500 ? <p className="text-xs text-ink-muted">Se afișează primele 500. Folosește sugestiile pentru volume mari.</p> : null}
          </>
        ) : (
          <p className="rounded-md border border-dashed border-border bg-surface p-6 text-center text-sm text-ink-muted">
            Toate keywordurile sunt atribuite unui cluster.
          </p>
        )}
      </section>
    </div>
  );
}
