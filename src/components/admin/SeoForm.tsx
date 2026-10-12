"use client";

import { useActionState, useState } from "react";
import type { SeoFormState } from "@/app/admin/(panel)/seo/types";
import {
  effectiveSeo,
  evaluateSeo,
  type MetaDefaults,
  type SeoOverride,
  TITLE_MIN,
  TITLE_MAX,
  DESC_MIN,
  DESC_MAX,
} from "@/lib/seo";
import { siteConfig } from "@/lib/site";
import { MediaField } from "@/components/admin/MediaField";

interface Props {
  action: (state: SeoFormState, formData: FormData) => Promise<SeoFormState>;
  defaults: MetaDefaults;
  seo: SeoOverride | null;
}

const input =
  "h-10 rounded-sm border border-border bg-field px-3 text-sm text-ink outline-none focus-visible:border-accent";
const area =
  "min-h-20 rounded-sm border border-border bg-field px-3 py-2 text-sm text-ink outline-none focus-visible:border-accent";

const DOT: Record<string, string> = { green: "bg-accent", yellow: "bg-gold", red: "bg-danger" };

function CharCount({ n, min, max }: { n: number; min: number; max: number }) {
  const ok = n >= min && n <= max;
  return (
    <span className={ok ? "text-ink-muted" : "text-gold"}>
      {n} caractere (recomandat {min}–{max})
    </span>
  );
}

export function SeoForm({ action, defaults, seo }: Props) {
  const [state, formAction, pending] = useActionState<SeoFormState, FormData>(action, { error: null });

  const [metaTitle, setMetaTitle] = useState(seo?.meta_title ?? "");
  const [metaDescription, setMetaDescription] = useState(seo?.meta_description ?? "");
  const [canonical, setCanonical] = useState(seo?.canonical ?? "");
  const [robotsIndex, setRobotsIndex] = useState(seo?.robots_index ?? true);
  const [robotsFollow, setRobotsFollow] = useState(seo?.robots_follow ?? true);
  const [ogTitle, setOgTitle] = useState(seo?.og_title ?? "");
  const [ogDescription, setOgDescription] = useState(seo?.og_description ?? "");
  const [ogImage, setOgImage] = useState(seo?.og_image ?? "");

  const live: SeoOverride = {
    meta_title: metaTitle || null,
    meta_description: metaDescription || null,
    canonical: canonical || null,
    robots_index: robotsIndex,
    robots_follow: robotsFollow,
    og_title: ogTitle || null,
    og_description: ogDescription || null,
    og_image: ogImage || null,
  };
  const eff = effectiveSeo(defaults, live);
  const { indicator, issues } = evaluateSeo(defaults, live);
  const serpUrl = siteConfig.url.replace(/^https?:\/\//, "") + eff.canonical;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
      <form action={formAction} className="flex flex-col gap-5">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-ink-secondary">Meta title</span>
          <input name="meta_title" value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} placeholder={defaults.title} className={input} />
          <CharCount n={eff.title.length} min={TITLE_MIN} max={TITLE_MAX} />
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-ink-secondary">Meta description</span>
          <textarea name="meta_description" value={metaDescription} onChange={(e) => setMetaDescription(e.target.value)} placeholder={defaults.description} className={area} />
          <CharCount n={eff.description.length} min={DESC_MIN} max={DESC_MAX} />
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-ink-secondary">Canonical (override, rută internă)</span>
          <input name="canonical" value={canonical} onChange={(e) => setCanonical(e.target.value)} placeholder={defaults.path} className={input} />
          <span className="text-xs text-ink-muted">Gol = {defaults.path}. Doar rute interne (/…).</span>
        </label>

        <div className="flex flex-wrap gap-6">
          <label className="flex items-center gap-2 text-sm text-ink">
            <input type="checkbox" name="robots_index" checked={robotsIndex} onChange={(e) => setRobotsIndex(e.target.checked)} />
            index
          </label>
          <label className="flex items-center gap-2 text-sm text-ink">
            <input type="checkbox" name="robots_follow" checked={robotsFollow} onChange={(e) => setRobotsFollow(e.target.checked)} />
            follow
          </label>
        </div>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-ink-secondary">OG title</span>
          <input name="og_title" value={ogTitle} onChange={(e) => setOgTitle(e.target.value)} placeholder={eff.title} className={input} />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-ink-secondary">OG description</span>
          <textarea name="og_description" value={ogDescription} onChange={(e) => setOgDescription(e.target.value)} placeholder={eff.description} className={area} />
        </label>

        <MediaField label="OG image" name="og_image" defaultValue={seo?.og_image ?? ""} folder="general" onChange={setOgImage} />

        {state.error ? <p role="alert" className="text-sm font-medium text-danger">{state.error}</p> : null}

        <div className="flex items-center gap-3">
          <button type="submit" disabled={pending} className="h-10 rounded-sm bg-accent px-5 text-sm font-semibold text-[#06110a] hover:bg-accent-hover disabled:opacity-50">
            {pending ? "Se salvează…" : "Salvează SEO"}
          </button>
          <a href="/admin/seo" className="text-sm text-ink-secondary hover:text-ink">Anulează</a>
        </div>
      </form>

      <aside className="flex flex-col gap-5">
        <div className="rounded-md border border-border bg-surface p-4">
          <div className="mb-3 flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${DOT[indicator]}`} />
            <span className="text-sm font-semibold text-ink">
              {indicator === "green" ? "Complet" : indicator === "yellow" ? "De îmbunătățit" : "Probleme"}
            </span>
          </div>
          {issues.length ? (
            <ul className="flex flex-col gap-1 text-xs">
              {issues.map((i, k) => (
                <li key={k} className={i.level === "red" ? "text-danger" : "text-gold"}>• {i.msg}</li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-ink-muted">Fără probleme.</p>
          )}
        </div>

        <div className="rounded-md border border-border bg-surface p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">Preview Google</p>
          <div className="flex flex-col gap-0.5">
            <span className="truncate text-xs text-ink-secondary">{serpUrl}</span>
            <span className="truncate text-[15px] text-link-hover">{eff.title}</span>
            <span className="line-clamp-2 text-xs text-ink-secondary">{eff.description}</span>
          </div>
        </div>

        <div className="rounded-md border border-border bg-surface p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">Preview social (OG)</p>
          <div className="overflow-hidden rounded-sm border border-border">
            <div className="flex aspect-[1.91/1] items-center justify-center bg-elevated">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={eff.ogImage} alt="" className="max-h-full max-w-full object-contain" />
            </div>
            <div className="flex flex-col gap-0.5 p-2.5">
              <span className="truncate text-xs uppercase text-ink-muted">{serpUrl.split("/")[0]}</span>
              <span className="truncate text-sm font-semibold text-ink">{eff.ogTitle}</span>
              <span className="line-clamp-2 text-xs text-ink-secondary">{eff.ogDescription}</span>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
