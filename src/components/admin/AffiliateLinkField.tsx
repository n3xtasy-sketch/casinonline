"use client";

import { useMemo, useState } from "react";
import { AFFILIATE_PLACEMENTS, placementLabel } from "@/lib/affiliate-placements";
import { computeLinkPreview, type LinkMode } from "@/lib/affiliate-link-preview";
import type { AffiliateLinkChoice } from "@/lib/db/admin-bonuses";

interface Props {
  /** Currently selected casino (lifted from the parent form's casino <select>). */
  casinoId: string;
  /** Slug of the selected casino, for the /go route + live preview. */
  casinoSlug?: string;
  /** Bonus slug — fixed in edit, the live slug input value in create. */
  bonusSlug: string;
  /** All affiliate links (active + inactive), used filtered by casino. */
  links: AffiliateLinkChoice[];
  /** Initial affiliate_link_id (edit); "" = main link. */
  initialLinkId: string;
  mode: "create" | "edit";
  /** Server action → resolver result for the SAVED state. */
  previewAction: (casinoSlug: string, bonusSlug: string) => Promise<{ url: string | null }>;
}

const input =
  "h-10 rounded-sm border border-border bg-field px-3 text-sm text-ink outline-none focus-visible:border-accent";
const box = "rounded-sm border border-border/60 bg-surface p-3 text-sm";

function linkLabel(l: AffiliateLinkChoice): string {
  const parts = [placementLabel(l.placement)];
  if (l.campaign) parts.push(`„${l.campaign}”`);
  parts.push(l.url);
  if (!l.isActive) parts.push("(inactiv)");
  return parts.join(" · ");
}

export function AffiliateLinkField({
  casinoId,
  casinoSlug,
  bonusSlug,
  links,
  initialLinkId,
  mode,
  previewAction,
}: Props) {
  const initial = links.find((l) => l.id === initialLinkId);
  const [linkMode, setLinkMode] = useState<LinkMode>(initialLinkId ? "existing" : "main");
  const [existingId, setExistingId] = useState<string>(initialLinkId);
  const [newUrl, setNewUrl] = useState("");
  const [newPlacement, setNewPlacement] = useState("bonus_claim");
  const [newCampaign, setNewCampaign] = useState("");

  // Active links of the selected casino (for the "existing" <select>).
  const activeLinks = useMemo(
    () => links.filter((l) => l.casinoId === casinoId && l.isActive),
    [links, casinoId],
  );

  // All derivation (reset #7 + preview type/url) lives in the unit-tested pure helper.
  const { effectiveMode, validExistingId, selected, localType, localUrl } = computeLinkPreview({
    mode: linkMode,
    existingId,
    casinoId,
    links,
    newUrl,
  });
  const selectedInactive = Boolean(selected && !selected.isActive);
  const initialOtherCasino = Boolean(initial && initial.casinoId !== casinoId);
  const mainLink = activeLinks.find((l) => l.placement === "review_cta") ?? null;
  const route = casinoSlug && bonusSlug ? `/go/${casinoSlug}/${bonusSlug}` : "—";

  // Live preview (resolver, saved state). Staleness is DERIVED by comparing the current
  // selection signature to the one captured when the resolver was last queried — no effect.
  const sig = JSON.stringify([effectiveMode, validExistingId, newUrl, newPlacement, newCampaign, casinoId]);
  const [live, setLive] = useState<{ url: string | null; sig: string } | null>(null);
  const [livePending, setLivePending] = useState(false);
  const liveStale = live != null && live.sig !== sig;
  async function checkLive() {
    if (!casinoSlug || !bonusSlug) return;
    setLivePending(true);
    try {
      const res = await previewAction(casinoSlug, bonusSlug);
      setLive({ url: res.url, sig });
    } finally {
      setLivePending(false);
    }
  }

  const radio = (value: LinkMode, label: string) => (
    <label className="flex items-center gap-2">
      <input
        type="radio"
        name="__link_mode_radio"
        checked={effectiveMode === value}
        onChange={() => setLinkMode(value)}
      />
      <span>{label}</span>
    </label>
  );

  return (
    <div className="flex flex-col gap-3">
      {/* Hidden inputs submitted with the parent form */}
      <input type="hidden" name="link_mode" value={effectiveMode} />
      <input type="hidden" name="affiliate_link_id" value={effectiveMode === "existing" ? validExistingId : ""} />
      <input type="hidden" name="new_link_url" value={effectiveMode === "new" ? newUrl : ""} />
      <input type="hidden" name="new_link_placement" value={effectiveMode === "new" ? newPlacement : ""} />
      <input type="hidden" name="new_link_campaign" value={effectiveMode === "new" ? newCampaign : ""} />

      {!casinoId ? (
        <p className="text-sm text-ink-muted">Alege întâi un cazino pentru a gestiona linkul CTA.</p>
      ) : null}

      {initialOtherCasino ? (
        <p role="alert" className="rounded-sm border border-gold/40 bg-gold/10 px-3 py-2 text-sm text-ink">
          ⚠️ Linkul asociat anterior aparține altui cazino și nu mai e compatibil. Selecția a fost
          resetată la linkul principal.
        </p>
      ) : null}

      <div className="flex flex-col gap-2 text-sm text-ink">
        {radio("main", "A. Folosește linkul principal al cazinoului (implicit)")}
        {radio("existing", "B. Folosește un link existent al acestui cazino")}
        {radio("new", "C. Creează un link nou pentru promoție")}
      </div>

      {effectiveMode === "main" ? (
        <p className="text-sm text-ink-secondary">
          {mainLink
            ? `Va folosi linkul principal (review_cta): ${mainLink.url}`
            : "Cazinoul nu are încă un link principal activ → CTA cade pe recenzia on-site (same-origin)."}
        </p>
      ) : null}

      {effectiveMode === "existing" ? (
        <div className="flex flex-col gap-2">
          <select
            className={input}
            value={validExistingId}
            onChange={(e) => setExistingId(e.target.value)}
          >
            <option value="">— alege un link activ —</option>
            {activeLinks.map((l) => (
              <option key={l.id} value={l.id}>
                {linkLabel(l)}
              </option>
            ))}
          </select>
          {activeLinks.length === 0 ? (
            <p className="text-sm text-ink-muted">Acest cazino nu are linkuri active. Creează unul nou (C).</p>
          ) : null}
          {selectedInactive ? (
            <p role="alert" className="text-sm font-medium text-gold">
              ⚠️ Linkul selectat este inactiv → CTA va cădea pe linkul principal / recenzie. Alege un link
              activ sau reactivează-l din Admin → Affiliate Links.
            </p>
          ) : null}
        </div>
      ) : null}

      {effectiveMode === "new" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
            <span className="font-medium text-ink-secondary">URL nou (https://) *</span>
            <input
              className={input}
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              placeholder="https://afiliat.example/promo"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-ink-secondary">Placement</span>
            <select className={input} value={newPlacement} onChange={(e) => setNewPlacement(e.target.value)}>
              {AFFILIATE_PLACEMENTS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-ink-secondary">Campanie (opțional)</span>
            <input
              className={input}
              value={newCampaign}
              onChange={(e) => setNewCampaign(e.target.value)}
              placeholder="ex. black-friday"
            />
          </label>
          <p className="text-xs text-ink-muted sm:col-span-2">
            Se asociază automat cazinoului selectat. Dacă există deja un link activ identic (cazino + URL +
            placement + campanie), acela e reutilizat.
          </p>
        </div>
      ) : null}

      {/* Preview local (selecție curentă, nesalvată) */}
      <div className={box}>
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-muted">
          Preview selecție curentă {mode === "create" ? "(nesalvat)" : "(nesalvat — reflectă formularul)"}
        </p>
        <ul className="flex flex-col gap-0.5 text-ink-secondary">
          <li>
            Tip link: <strong className="text-ink">{localType}</strong>
            {localType === "fallback" ? " (nu va fi o destinație externă validă)" : ""}
          </li>
          <li>Link selectat: <span className="text-ink">{localUrl ?? "— (linkul principal / recenzie)"}</span></li>
          <li>Rută internă: <code className="text-ink">{route}</code></li>
          {effectiveMode === "existing" && selected ? (
            <li>Status link: <span className="text-ink">{selected.isActive ? "activ" : "inactiv"}</span></li>
          ) : null}
        </ul>
      </div>

      {/* Preview live (resolver, stare salvată) */}
      <div className={box}>
        <div className="mb-1 flex items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
            Destinație efectivă (resolver — stare salvată)
          </p>
          <button
            type="button"
            onClick={checkLive}
            disabled={mode === "create" || livePending || !casinoSlug || !bonusSlug}
            className="h-8 rounded-sm border border-border px-3 text-xs font-medium text-ink hover:bg-elevated disabled:opacity-50"
          >
            {livePending ? "Se verifică…" : "Verifică live"}
          </button>
        </div>
        {mode === "create" ? (
          <p className="text-ink-muted">Disponibil după prima salvare a bonusului.</p>
        ) : live ? (
          <p className="text-ink-secondary">
            Resolver: <span className="text-ink">{live.url ?? "fallback same-origin (/cazinouri-online/…)"}</span>
            {liveStale ? (
              <span className="ml-2 font-medium text-gold">(există modificări nesalvate — resalvează, apoi verifică)</span>
            ) : null}
          </p>
        ) : (
          <p className="text-ink-muted">Apasă „Verifică live” pentru destinația confirmată de resolver.</p>
        )}
      </div>
    </div>
  );
}
