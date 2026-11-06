"use client";

import { useMemo, useState } from "react";
import { evergreenBonusMatches, intentLabel } from "@/lib/evergreen-bonus";
import { resolveOfferDestination, evergreenKey, type OfferForDestination } from "@/lib/seo/offer-destination";
import type { EvergreenPageChoice } from "@/lib/db/admin-bonuses";

/**
 * URL-2 CMS field: shows the auto-recommended SEO destination and lets the editor override it with a
 * PUBLISHED, SEMANTICALLY-COMPATIBLE evergreen page of the SAME operator. Reuses the exact resolver
 * + predicate used on the frontend. NULL ("") = automatic. Never proposes an incompatible page; when
 * the operator/offer changes and a saved override becomes incompatible, it warns and asks for an
 * explicit confirmation before clearing it (it does not silently drop it).
 */
export function BonusSeoDestinationField(props: {
  casinoId: string;
  casinoSlug: string;
  bonusTypeSlug: string;
  freeSpins: string;
  isNoDeposit: boolean;
  isNoWagering: boolean;
  evergreenPages: EvergreenPageChoice[];
  publishedBonusCategories: string[];
  initialOverrideId: string;
}) {
  const [overrideId, setOverrideId] = useState(props.initialOverrideId);

  const offer: OfferForDestination = useMemo(
    () => ({
      casinoSlug: props.casinoSlug,
      typeSlug: props.bonusTypeSlug,
      freeSpins: props.freeSpins ? Number(props.freeSpins) : null,
      isNoDeposit: props.isNoDeposit,
      isNoWagering: props.isNoWagering,
    }),
    [props.casinoSlug, props.bonusTypeSlug, props.freeSpins, props.isNoDeposit, props.isNoWagering],
  );

  const publishedEvergreen = useMemo(
    () => new Set(props.evergreenPages.map((p) => evergreenKey(p.casinoSlug, p.intent))),
    [props.evergreenPages],
  );
  const categories = useMemo(() => new Set(props.publishedBonusCategories), [props.publishedBonusCategories]);

  // Candidate pages: same operator + semantically compatible with the current offer.
  const candidates = useMemo(
    () => props.evergreenPages.filter((p) => p.casinoId === props.casinoId && evergreenBonusMatches(p.intent, offer)),
    [props.evergreenPages, props.casinoId, offer],
  );
  const overrideValid = overrideId === "" || candidates.some((c) => c.id === overrideId);
  const overridePage = props.evergreenPages.find((p) => p.id === overrideId) ?? null;

  const auto = resolveOfferDestination(offer, { publishedEvergreen, publishedBonusCategories: categories, override: null });
  const effective =
    overrideId && overrideValid && overridePage
      ? resolveOfferDestination(offer, {
          publishedEvergreen,
          publishedBonusCategories: categories,
          override: { casinoSlug: overridePage.casinoSlug, intent: overridePage.intent },
        })
      : auto;

  const label = "font-medium text-ink-secondary";
  const code = "font-mono text-[12px] text-link";

  return (
    <fieldset className="flex flex-col gap-3 rounded-md border border-border p-4">
      <legend className="px-1 text-sm font-semibold text-ink">I. Destinație SEO</legend>

      {/* persisted value — "" = automatic (NULL). The incompatible value is kept so the server
          rejects it until the editor explicitly reverts to automatic. */}
      <input type="hidden" name="seo_destination_page_id" value={overrideId} />

      {!props.casinoId ? (
        <p className="text-sm text-ink-muted">Alege întâi cazinoul pentru a vedea destinația SEO.</p>
      ) : (
        <>
          <p className="text-sm">
            <span className={label}>Destinație automată: </span>
            <span className={code}>{auto.url}</span>
            <span className="ml-1 text-[11px] text-ink-muted">({auto.kind})</span>
          </p>

          <label className="flex flex-col gap-1.5 text-sm">
            <span className={label}>Override editorial (opțional)</span>
            <select
              value={overrideValid ? overrideId : ""}
              onChange={(e) => setOverrideId(e.target.value)}
              className="h-10 rounded-sm border border-border bg-field px-3 text-sm text-ink outline-none focus-visible:border-accent"
            >
              <option value="">Automat (recomandat)</option>
              {candidates.map((c) => (
                <option key={c.id} value={c.id}>
                  {intentLabel(c.intent) ?? c.intent} — /cazinouri-online/{c.casinoSlug}/{c.intent}
                </option>
              ))}
            </select>
          </label>

          {candidates.length === 0 ? (
            <p className="text-sm text-ink-muted">
              Nicio pagină evergreen eligibilă (publicată + compatibilă) pentru acest operator/tip — se folosește destinația automată.
            </p>
          ) : null}

          {overrideId && !overrideValid ? (
            <div className="flex flex-col gap-2 rounded-sm border border-danger/40 bg-danger/10 p-3 text-sm text-danger">
              <span>
                Override-ul salvat a devenit incompatibil (operator sau caracteristici schimbate). Nu a fost eliminat automat —
                confirmă pentru a reveni la destinația automată.
              </span>
              <button
                type="button"
                onClick={() => setOverrideId("")}
                className="h-8 w-fit rounded-sm border border-danger/50 px-3 text-xs font-medium hover:bg-danger/15"
              >
                Revino la automat
              </button>
            </div>
          ) : (
            <p className="text-sm">
              <span className={label}>Destinație efectivă: </span>
              <span className={code}>{effective.url}</span>
              <span className="ml-1 text-[11px] text-ink-muted">({effective.kind})</span>
            </p>
          )}

          <p className="text-[11px] text-ink-muted">
            CTA-ul „Revendică bonusul” rămâne linkul afiliat — separat de destinația SEO. Publicarea paginii se validează la salvare.
          </p>
        </>
      )}
    </fieldset>
  );
}
