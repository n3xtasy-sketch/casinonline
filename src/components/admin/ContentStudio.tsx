"use client";

import { useState, useTransition } from "react";
import {
  loadProjectBriefsAction, loadStudioBriefAction,
  type StudioBrief, type StudioBriefOption,
} from "@/app/admin/(panel)/content-studio/actions";
import { generateBriefSectionAction } from "@/app/admin/(panel)/seo-research/[id]/briefs/ai-actions";
import type { SectionGenerationResult } from "@/lib/ai/generate-section";
import {
  errorLabel, isDirty, needsRegenerateConfirm,
  factualReviewRows, rowsInGroup, verdictLabel, nonClaimMessages,
  type ClaimGroup, type FactualReviewRow,
} from "@/lib/ai/content-studio-model";
import { AUTHOR_PROFILE } from "@/lib/ai/author-profile";

const input = "h-10 rounded-sm border border-border bg-field px-3 text-sm text-ink outline-none focus-visible:border-accent";
const area = "min-h-48 rounded-sm border border-border bg-field px-3 py-2 text-sm text-ink outline-none focus-visible:border-accent font-mono";
const chip = "inline-flex rounded-full bg-elevated px-2 py-0.5 text-[11px] text-ink-secondary";

const sectionLabel = (s: StudioBrief["sections"][number]) =>
  `${s.kind === "intro" ? "Intro" : s.kind === "faq" ? "FAQ" : `H${s.level}`} · ${s.heading}`;

// AI-2.7.1 — Factual Review groups. Supported (accent), editorial review (gold), blocked (danger).
const GROUP_META: Record<ClaimGroup, { box: string; text: string; label: string }> = {
  supported: { box: "border-accent/40 bg-accent/5", text: "text-accent", label: "Sustinute de fapte CMS verificate" },
  review: { box: "border-gold/40 bg-gold/10", text: "text-gold", label: "Necesita verificare editoriala" },
  blocked: { box: "border-danger/40 bg-danger/10", text: "text-danger", label: "Respinse (factual) — blocheaza sectiunea" },
};

function FactualGroup({ group, rows }: { group: ClaimGroup; rows: FactualReviewRow[] }) {
  if (!rows.length) return null;
  const m = GROUP_META[group];
  return (
    <div className={`flex flex-col gap-1.5 rounded-sm border p-2.5 ${m.box}`}>
      <span className={`text-[12px] font-semibold ${m.text}`}>{m.label} ({rows.length})</span>
      <ul className="flex flex-col gap-2">
        {rows.map((r, i) => (
          <li key={i} className="text-[12px]">
            <div className="text-ink">{r.claim}</div>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-ink-muted">
              <span className={`${chip} ${m.text}`}>{verdictLabel(r.verdict)}</span>
              <span>sursa: <span className="font-mono text-ink-secondary">{r.sourceRef ?? "fara sursa"}</span></span>
            </div>
            {r.reason ? <div className="mt-0.5 text-ink-muted">{r.reason}</div> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ContentStudio({ projects }: { projects: { id: string; name: string }[] }) {
  const [projectId, setProjectId] = useState("");
  const [briefs, setBriefs] = useState<StudioBriefOption[]>([]);
  const [briefId, setBriefId] = useState("");
  const [studio, setStudio] = useState<StudioBrief | null>(null);
  const [sectionId, setSectionId] = useState("");
  const [result, setResult] = useState<SectionGenerationResult | null>(null);
  const [content, setContent] = useState("");
  const [baseline, setBaseline] = useState("");
  const [notice, setNotice] = useState<{ tone: "ok" | "err"; text: string } | null>(null);
  const [pending, start] = useTransition();

  const dirty = !!result?.section && isDirty(content, baseline);

  const selectProject = (id: string) => {
    setProjectId(id); setBriefId(""); setBriefs([]); setStudio(null); setResult(null); setNotice(null);
    if (!id) return;
    start(async () => { try { setBriefs(await loadProjectBriefsAction(id)); } catch { setNotice({ tone: "err", text: "Nu s-au putut încărca brief-urile." }); } });
  };

  const selectBrief = (id: string) => {
    setBriefId(id); setStudio(null); setResult(null); setSectionId(""); setNotice(null);
    if (!id) return;
    start(async () => {
      try {
        const s = await loadStudioBriefAction(projectId, id);
        setStudio(s);
        setSectionId(s?.sections[0]?.id ?? "");
        if (!s) setNotice({ tone: "err", text: "Brief inexistent." });
      } catch { setNotice({ tone: "err", text: "Nu s-a putut încărca brief-ul." }); }
    });
  };

  const generate = (force: boolean) => {
    if (!projectId || !briefId || !sectionId) return;
    if (!force && needsRegenerateConfirm(content, baseline, !!result?.section)) {
      if (!window.confirm("Ai modificări manuale nesalvate. Regenerarea le va înlocui. Continui?")) return;
    }
    setNotice(null);
    start(async () => {
      const r = await generateBriefSectionAction(projectId, briefId, sectionId);
      setResult(r);
      if (r.ok && r.section) { setContent(r.section.content); setBaseline(r.section.content); setNotice({ tone: "ok", text: "Secțiune generată." }); }
    });
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Selectoare proiect + brief + secțiune */}
      <section className="grid gap-4 sm:grid-cols-3">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-ink-secondary">Proiect SEO</span>
          <select value={projectId} onChange={(e) => selectProject(e.target.value)} className={input}>
            <option value="">— alege proiect —</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-ink-secondary">Brief</span>
          <select value={briefId} onChange={(e) => selectBrief(e.target.value)} disabled={!briefs.length} className={input}>
            <option value="">{briefs.length ? "— alege brief —" : "—"}</option>
            {briefs.map((b) => <option key={b.id} value={b.id}>{b.title}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-ink-secondary">Secțiune</span>
          <select value={sectionId} onChange={(e) => setSectionId(e.target.value)} disabled={!studio} className={input}>
            {studio ? studio.sections.map((s) => <option key={s.id} value={s.id}>{sectionLabel(s)}</option>) : <option value="">—</option>}
          </select>
        </label>
      </section>

      {/* Info brief */}
      {studio ? (
        <section className="grid gap-3 rounded-md border border-border bg-surface p-4 text-sm sm:grid-cols-2">
          <div><span className="text-ink-muted">Keyword principal:</span> <b className="text-ink">{studio.primaryKeyword || "—"}</b></div>
          <div><span className="text-ink-muted">Intenție:</span> <b className="text-ink">{studio.intent || "—"}</b></div>
          <div><span className="text-ink-muted">URL țintă:</span> <span className="font-mono text-[12px] text-link">{studio.targetUrl || "—"}</span></div>
          <div><span className="text-ink-muted">H1:</span> <b className="text-ink">{studio.h1 || "—"}</b></div>
          <div className="sm:col-span-2">
            <div className="text-ink-muted">Outline H2/H3:</div>
            <ul className="mt-1 flex flex-col gap-0.5">
              {studio.outline.length ? studio.outline.map((o, i) => <li key={i} className="text-ink-secondary">{" ".repeat((o.level - 2) * 2)}H{o.level} · {o.heading}</li>) : <li className="text-ink-muted">—</li>}
            </ul>
          </div>
          <div className="sm:col-span-2">
            <div className="text-ink-muted">Entități confirmate:</div>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {studio.confirmedEntities.length ? studio.confirmedEntities.map((e, i) => <span key={i} className={chip}>{e.name} · {e.type}</span>) : <span className="text-ink-muted">—</span>}
            </div>
          </div>
        </section>
      ) : null}

      {/* Acțiuni */}
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => generate(true)} disabled={pending || !sectionId}
          className="h-10 rounded-sm bg-accent px-5 text-sm font-semibold text-[#06110a] hover:bg-accent-hover disabled:opacity-50">
          {pending ? "Se generează…" : "Generează secțiunea"}
        </button>
        {result?.section ? (
          <button type="button" onClick={() => generate(false)} disabled={pending}
            className="h-10 rounded-sm border border-border px-4 text-sm font-medium text-ink hover:bg-elevated disabled:opacity-50">
            Regenerează secțiunea
          </button>
        ) : null}
        {pending ? <span className="inline-flex items-center gap-1.5 text-sm text-ink-muted"><span className="h-2 w-2 animate-pulse rounded-full bg-accent" />lucrez…</span> : null}
        {dirty ? <span className="inline-flex items-center gap-1.5 text-sm font-medium text-gold"><span className="h-2 w-2 rounded-full bg-gold" />modificări nesalvate</span> : null}
      </div>

      {notice ? <p role="status" className={`text-sm font-medium ${notice.tone === "ok" ? "text-accent" : "text-danger"}`}>{notice.text}</p> : null}

      {result?.usage ? (
        <p className="text-[11px] text-ink-muted">
          Model: <span className="text-ink-secondary">{result.model ?? "—"}</span> · tokeni:{" "}
          <span className="tabular-nums text-ink-secondary">{result.usage.inputTokens} in / {result.usage.outputTokens} out</span>
          {result.stopReason ? <> · stop: <span className="text-ink-secondary">{result.stopReason}</span></> : null}
          {" · cost: "}
          <span className="text-ink-secondary">{result.cost ? `${result.cost.total.toFixed(4)} ${result.cost.currency}` : "tarife neconfigurate"}</span>
        </p>
      ) : null}

      {/* Erori blocante (grounding, non-factual-claim — cele factuale apar structurat in panoul de mai jos) */}
      {result && !result.ok ? (
        <div className="flex flex-col gap-1 rounded-md border border-danger/40 bg-danger/10 p-3 text-sm">
          <span className="font-semibold text-danger">{errorLabel(result.errorKind ?? "api_error").label}</span>
          <span className="text-ink-secondary">{result.error}</span>
          {nonClaimMessages(result.validation?.errors).length ? (
            <ul className="mt-1 list-disc pl-5 text-[12px] text-ink-muted">{nonClaimMessages(result.validation?.errors).map((e, i) => <li key={i}>{e}</li>)}</ul>
          ) : null}
        </div>
      ) : null}

      {/* AI-2.7.1 — Verificare factuala (sourceRef + claimChecks), grupata pe verdict */}
      {result?.validation?.claimChecks?.length ? (() => {
        const rows = factualReviewRows(result.section?.factualClaims, result.validation.claimChecks);
        return (
          <section className="flex flex-col gap-2 rounded-md border border-border bg-surface p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-ink">Verificare factuala</h3>
              <span className="text-[11px] text-ink-muted">{rows.length} afirmatii</span>
            </div>
            <FactualGroup group="blocked" rows={rowsInGroup(rows, "blocked")} />
            <FactualGroup group="review" rows={rowsInGroup(rows, "review")} />
            <FactualGroup group="supported" rows={rowsInGroup(rows, "supported")} />
            <p className="text-[11px] text-ink-muted">Verdictele provin din verificarea determinista a surselor. „Sustinut” nu inseamna aprobare editoriala finala.</p>
          </section>
        );
      })() : null}

      {/* AI-2.7.1 — Alte avertismente de validare (non-claim: cifre nesursate, keyword stuffing) */}
      {nonClaimMessages(result?.validation?.warnings).length ? (
        <div className="flex flex-col gap-1 rounded-md border border-gold/40 bg-gold/5 p-3 text-sm">
          <span className="font-semibold text-gold">Avertismente de validare</span>
          <ul className="list-disc pl-5 text-[12px] text-ink-secondary">
            {nonClaimMessages(result?.validation?.warnings).map((w, i) => <li key={i}>{w}</li>)}
          </ul>
        </div>
      ) : null}

      {/* Recomandari EDITORIALE (stil) — advisory, NU blocheaza; distincte de erorile factuale de mai sus */}
      {result?.editorial && (result.editorial.warnings.length || result.editorial.suggestions.length) ? (
        <div className="flex flex-col gap-1.5 rounded-md border border-link/40 bg-link/5 p-3 text-sm">
          <span className="font-semibold text-link">Recomandări editoriale (stil) · nu blochează publicarea</span>
          {result.editorial.warnings.length ? (
            <ul className="list-disc pl-5 text-[12px] text-ink-secondary">{result.editorial.warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>
          ) : null}
          {result.editorial.suggestions.length ? (
            <div className="mt-1 text-[12px] text-ink-muted">
              <span className="font-medium">Sugestii:</span>
              <ul className="list-disc pl-5">{result.editorial.suggestions.map((s, i) => <li key={i}>{s}</li>)}</ul>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Rezultat */}
      {result?.ok && result.section ? (
        <section className="flex flex-col gap-3 rounded-md border border-border bg-surface p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-lg font-semibold text-ink">{result.section.heading}</h2>
            <span className="text-[12px] text-ink-muted">Autor: <span className="font-medium text-ink-secondary">{AUTHOR_PROFILE.name}</span> · {AUTHOR_PROFILE.role}</span>
          </div>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-ink-secondary">Conținut generat (editabil — nu se salvează automat)</span>
            <textarea value={content} onChange={(e) => setContent(e.target.value)} className={area} />
          </label>
          <div className="grid gap-2 text-[12px] text-ink-secondary sm:grid-cols-2">
            <div><span className="text-ink-muted">Keywords:</span> {result.section.keywordsUsed.join(", ") || "—"}</div>
            <div><span className="text-ink-muted">Entități:</span> {result.section.entitiesUsed.join(", ") || "—"}</div>
            <div className="sm:col-span-2"><span className="text-ink-muted">Linkuri interne:</span> {result.section.internalLinks.map((u) => <span key={u} className="mr-2 font-mono text-link">{u}</span>) || "—"}</div>
          </div>
          {(result.section.warnings.length || result.promptWarnings.length) ? (
            <div className="rounded-sm border border-gold/40 bg-gold/10 p-2 text-[12px] text-gold">
              <div className="font-semibold">Warnings / fapte lipsă:</div>
              <ul className="list-disc pl-5">
                {[...result.promptWarnings, ...result.section.warnings].map((w, i) => <li key={i}>{w}</li>)}
              </ul>
            </div>
          ) : null}
          <p className="text-[11px] text-ink-muted">Verifică editorial înainte de orice utilizare. Salvarea în CMS (draft) + istoricul sunt pașii următori.</p>
        </section>
      ) : null}
    </div>
  );
}
