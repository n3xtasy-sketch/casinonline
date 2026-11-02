"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  saveBriefAction, transitionBriefAction, regenerateBriefAction, deleteBriefAction,
  type BriefSavePayload,
} from "@/app/admin/(panel)/seo-research/[id]/briefs/brief-actions";
import { availableBriefTransitions, briefStatusLabel, type BriefStatus } from "@/lib/brief-status";
import type { BriefRow } from "@/lib/db/admin-seo-briefs";
import type { BriefEntity, FaqItem, OutlineItem, Provenance } from "@/lib/seo/brief";

const input = "h-10 rounded-sm border border-border bg-field px-3 text-sm text-ink outline-none focus-visible:border-accent";
const area = "min-h-20 rounded-sm border border-border bg-field px-3 py-2 text-sm text-ink outline-none focus-visible:border-accent font-mono";

// Field keys mirror brief.ts BRIEF_FIELDS (used for locking + provenance).
type FieldKey = "title" | "primary_keyword" | "secondary_keywords" | "intent" | "target_url" | "h1" | "outline" | "entities" | "faq";

const PROV_BADGE: Record<Provenance, { label: string; cls: string }> = {
  confirmed: { label: "confirmat", cls: "bg-accent/12 text-accent" },
  suggested: { label: "sugerat", cls: "bg-link/12 text-link" },
  manual: { label: "manual", cls: "bg-gold/15 text-gold" },
};

// ── (de)serialization for the structured textareas ────────────────────────────
const serOutline = (o: OutlineItem[]) => o.map((i) => `${i.level === 3 ? "### " : "## "}${i.heading}`).join("\n");
function parseOutline(raw: string, original: OutlineItem[]): OutlineItem[] {
  if (raw === serOutline(original)) return original; // untouched → preserve keywords/note
  return raw.split("\n").map((l) => l.trim()).filter(Boolean).map((l) => {
    if (l.startsWith("### ")) return { level: 3 as const, heading: l.slice(4).trim(), keywords: [], note: "" };
    if (l.startsWith("## ")) return { level: 2 as const, heading: l.slice(3).trim(), keywords: [], note: "" };
    return { level: 2 as const, heading: l.replace(/^#+\s*/, "").trim(), keywords: [], note: "" };
  });
}
const serEntities = (e: BriefEntity[]) => e.map((x) => `${x.name} | ${x.type}${x.source === "confirmed" ? " (CMS)" : ""}`).join("\n");
function parseEntities(raw: string, original: BriefEntity[]): BriefEntity[] {
  if (raw === serEntities(original)) return original; // untouched → preserve confirmed/ref
  return raw.split("\n").map((l) => l.trim()).filter(Boolean).map((l) => {
    const [name, type] = l.replace(/\s*\(CMS\)\s*$/i, "").split("|").map((s) => s.trim());
    return { name: name ?? l, type: type || "termen", source: "suggested" as const, ref: null };
  }).filter((x) => x.name);
}
const serFaq = (f: FaqItem[]) => f.map((x) => `${x.question} | ${x.answer}`).join("\n");
function parseFaq(raw: string, original: FaqItem[]): FaqItem[] {
  if (raw === serFaq(original)) return original;
  return raw.split("\n").map((l) => l.trim()).filter(Boolean).map((l) => {
    const i = l.indexOf("|");
    return i === -1 ? { question: l, answer: "" } : { question: l.slice(0, i).trim(), answer: l.slice(i + 1).trim() };
  }).filter((x) => x.question);
}

export function BriefEditor({ projectId, initial, urls }: { projectId: string; initial: BriefRow; urls: { url: string; title: string; status: string }[] }) {
  const router = useRouter();
  const [status, setStatus] = useState<BriefStatus>(initial.status);
  const [updatedAt, setUpdatedAt] = useState(initial.updatedAt);
  const [locked, setLocked] = useState<Set<FieldKey>>(new Set(initial.lockedFields as FieldKey[]));
  const [msg, setMsg] = useState<{ tone: "ok" | "err" | "warn"; text: string } | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [pending, start] = useTransition();
  const readOnly = status === "approved";

  // Field values.
  const [title, setTitle] = useState(initial.title ?? "");
  const [primaryKeyword, setPrimary] = useState(initial.primaryKeyword ?? "");
  const [secondary, setSecondary] = useState((initial.secondaryKeywords ?? []).join("\n"));
  const [intent, setIntent] = useState(initial.intent ?? "");
  const [targetUrl, setTargetUrl] = useState(initial.targetUrl ?? "");
  const [h1, setH1] = useState(initial.h1 ?? "");
  const [outline, setOutline] = useState(serOutline(initial.outline));
  const [entities, setEntities] = useState(serEntities(initial.entities));
  const [faq, setFaq] = useState(serFaq(initial.faq));
  const [notes, setNotes] = useState(initial.notes ?? "");

  const lock = (f: FieldKey) => setLocked((s) => new Set(s).add(f));
  const toggleLock = (f: FieldKey) => setLocked((s) => { const n = new Set(s); if (n.has(f)) n.delete(f); else n.add(f); return n; });
  const prov = (f: FieldKey): Provenance => (locked.has(f) ? "manual" : (initial.fieldProvenance[f] ?? "suggested"));

  const transitions = availableBriefTransitions(status);

  // Plain render FUNCTIONS (not components) — defining components inline would remount the
  // subtree on every keystroke and drop input focus.
  const renderBadge = (f: FieldKey) => {
    const b = PROV_BADGE[prov(f)];
    return (
      <span className="inline-flex items-center gap-2">
        <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${b.cls}`}>{b.label}</span>
        <label className="inline-flex items-center gap-1 text-[11px] text-ink-muted">
          <input type="checkbox" checked={locked.has(f)} onChange={() => toggleLock(f)} disabled={readOnly} /> lock
        </label>
      </span>
    );
  };

  const FIELD_LABELS: Record<FieldKey, string> = {
    title: "Titlu de lucru", primary_keyword: "Keyword principal", secondary_keywords: "Keyworduri secundare (câte unul pe linie)",
    intent: "Intenție (sugerată — fără validare SERP)", target_url: "URL țintă", h1: "H1 propus",
    outline: "Structură H2/H3 (## / ###)", entities: "Entități (nume | tip · CMS = verificat)", faq: "FAQ (Întrebare | Răspuns)",
  };
  const renderRow = (f: FieldKey, control: React.ReactNode) => (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="flex items-center justify-between gap-2">
        <span className="font-medium text-ink-secondary">{FIELD_LABELS[f]}</span>
        {renderBadge(f)}
      </span>
      {control}
    </label>
  );

  const save = () => {
    setMsg(null);
    const payload: BriefSavePayload = {
      title,
      primaryKeyword,
      secondaryKeywords: secondary.split("\n").map((s) => s.trim()).filter(Boolean),
      intent: intent.trim() || null,
      targetUrl: targetUrl.trim() || null,
      h1,
      outline: parseOutline(outline, initial.outline),
      entities: parseEntities(entities, initial.entities),
      faq: parseFaq(faq, initial.faq),
      notes,
      lockedFields: [...locked],
    };
    start(async () => {
      const r = await saveBriefAction(projectId, initial.id, payload, updatedAt);
      if ("error" in r) { setMsg({ tone: "err", text: r.error }); return; }
      setUpdatedAt(r.updatedAt);
      setWarnings(r.warnings);
      setMsg({ tone: "ok", text: "Salvat." });
      router.refresh();
    });
  };

  const transition = (next: BriefStatus, confirm?: string) => {
    if (confirm && !window.confirm(confirm)) return;
    setMsg(null);
    start(async () => {
      const r = await transitionBriefAction(projectId, initial.id, next, updatedAt);
      if ("error" in r) { setMsg({ tone: "err", text: r.error }); return; }
      setStatus(next);
      setUpdatedAt(r.updatedAt);
      setMsg({ tone: "ok", text: `Status: ${briefStatusLabel(next)}.` });
      router.refresh();
    });
  };

  const regenerate = () => {
    if (!window.confirm("Regenerezi din cluster? Câmpurile blocate (lock) și cele confirmate se păstrează.")) return;
    setMsg(null);
    start(async () => {
      const r = await regenerateBriefAction(projectId, initial.id);
      if ("error" in r) { setMsg({ tone: "err", text: r.error }); return; }
      setMsg({ tone: "warn", text: "Regenerat. Reîncarcă pagina pentru a vedea valorile actualizate." });
      setWarnings(r.warnings);
      router.refresh();
    });
  };

  const remove = () => {
    if (!window.confirm("Ștergi definitiv brief-ul?")) return;
    start(async () => {
      const r = await deleteBriefAction(projectId, initial.id);
      if ("error" in r) { setMsg({ tone: "err", text: r.error }); return; }
      router.push(`/admin/seo-research/${projectId}/briefs`);
    });
  };

  const reviewFlags = useMemo(() => (initial.sources as { reviewFlags?: string[] })?.reviewFlags ?? [], [initial.sources]);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_260px]">
      <div className="flex flex-col gap-4">
        {readOnly ? (
          <p className="rounded-sm border border-gold/40 bg-gold/10 px-3 py-2 text-sm text-gold">
            Brief aprobat — conținutul e blocat. Redeschide-l (din dreapta) pentru a edita.
          </p>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          {renderRow("title", <input className={input} value={title} onChange={(e) => { setTitle(e.target.value); lock("title"); }} readOnly={readOnly} />)}
          {renderRow("primary_keyword", <input className={input} value={primaryKeyword} onChange={(e) => { setPrimary(e.target.value); lock("primary_keyword"); }} readOnly={readOnly} />)}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {renderRow("intent", <input className={input} list="intent-opts" value={intent} onChange={(e) => { setIntent(e.target.value); lock("intent"); }} readOnly={readOnly} />)}
          {renderRow("h1", <input className={input} value={h1} onChange={(e) => { setH1(e.target.value); lock("h1"); }} readOnly={readOnly} />)}
        </div>
        {renderRow("target_url", <input className={input} list="url-opts" value={targetUrl} onChange={(e) => { setTargetUrl(e.target.value); lock("target_url"); }} readOnly={readOnly} placeholder="/cazinouri-online/..." />)}
        {renderRow("secondary_keywords", <textarea className={area} value={secondary} onChange={(e) => { setSecondary(e.target.value); lock("secondary_keywords"); }} readOnly={readOnly} />)}
        {renderRow("outline", <textarea className={`${area} min-h-32`} value={outline} onChange={(e) => { setOutline(e.target.value); lock("outline"); }} readOnly={readOnly} placeholder="## Secțiune principală&#10;### Subsecțiune" />)}
        {renderRow("entities", <textarea className={area} value={entities} onChange={(e) => { setEntities(e.target.value); lock("entities"); }} readOnly={readOnly} />)}
        {renderRow("faq", <textarea className={area} value={faq} onChange={(e) => { setFaq(e.target.value); lock("faq"); }} readOnly={readOnly} />)}

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-ink-secondary">Note editoriale</span>
          <textarea className={area.replace(" font-mono", "")} value={notes} onChange={(e) => setNotes(e.target.value)} readOnly={readOnly} />
        </label>

        <datalist id="intent-opts">
          {["informational", "commercial", "transactional", "navigational"].map((i) => <option key={i} value={i} />)}
        </datalist>
        <datalist id="url-opts">
          {urls.map((u) => <option key={u.url} value={u.url}>{`${u.title} (${u.status})`}</option>)}
        </datalist>

        {!readOnly ? (
          <div className="flex items-center gap-2">
            <button type="button" onClick={save} disabled={pending} className="h-10 rounded-sm bg-accent px-5 text-sm font-semibold text-[#06110a] hover:bg-accent-hover disabled:opacity-50">
              {pending ? "Se salvează…" : "Salvează"}
            </button>
          </div>
        ) : null}

        {msg ? <p role="alert" className={`text-sm font-medium ${msg.tone === "ok" ? "text-accent" : msg.tone === "warn" ? "text-gold" : "text-danger"}`}>{msg.text}</p> : null}
        {warnings.map((w, i) => <p key={i} className="text-sm text-gold">{w}</p>)}
      </div>

      {/* Right rail: status + actions */}
      <aside className="flex flex-col gap-4">
        <div className="rounded-md border border-border bg-surface p-4">
          <div className="text-xs uppercase tracking-wide text-ink-muted">Status</div>
          <div className="mt-1 text-lg font-semibold text-ink">{briefStatusLabel(status)}</div>
          <div className="mt-3 flex flex-col gap-2">
            {transitions.map((t) => (
              <button
                key={t.next}
                type="button"
                onClick={() => transition(t.next, t.confirm)}
                disabled={pending}
                className={`h-9 rounded-sm px-3 text-sm font-medium disabled:opacity-50 ${t.tone === "accent" ? "bg-accent text-[#06110a] hover:bg-accent-hover" : "border border-border text-ink hover:bg-elevated"}`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-md border border-border bg-surface p-4">
          <div className="text-xs uppercase tracking-wide text-ink-muted">Generare</div>
          <button
            type="button"
            onClick={regenerate}
            disabled={pending || status !== "draft" || !initial.clusterId}
            className="mt-2 h-9 w-full rounded-sm border border-border px-3 text-sm font-medium text-ink hover:bg-elevated disabled:opacity-50"
          >
            Regenerează din cluster
          </button>
          <p className="mt-1 text-[11px] text-ink-muted">
            {status !== "draft" ? "Doar în draft." : !initial.clusterId ? "Brief fără cluster." : "Păstrează câmpurile lock/confirmate."}
          </p>
          {reviewFlags.length ? <p className="mt-2 text-[11px] text-gold">De revizuit: {reviewFlags.join(", ")}</p> : null}
        </div>

        <button type="button" onClick={remove} disabled={pending} className="h-9 rounded-sm border border-danger/40 px-3 text-sm font-medium text-danger hover:bg-danger/10 disabled:opacity-50">
          Șterge brief
        </button>
      </aside>
    </div>
  );
}
