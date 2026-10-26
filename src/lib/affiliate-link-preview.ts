/**
 * Pure derivation logic for the bonus affiliate-link picker (client-safe, no deps).
 * Extracted from AffiliateLinkField so the reset (#7) + preview-type rules are unit-tested
 * independently of React/DOM. The component is a thin rendering shell over this.
 */

export type LinkMode = "main" | "existing" | "new";

export interface LinkLite {
  id: string;
  casinoId: string;
  placement: string;
  campaign: string | null;
  url: string;
  isActive: boolean;
}

export interface PreviewResult {
  /** Mode after the incompatible-selection reset (#7). */
  effectiveMode: LinkMode;
  /** existingId kept only if it belongs to the current casino; else "". */
  validExistingId: string;
  /** The selected link (same casino), or null. */
  selected: LinkLite | null;
  /** The casino's active main (review_cta) link, or null. */
  mainLink: LinkLite | null;
  /** How the CTA will resolve for the CURRENT (unsaved) selection. */
  localType: "principal" | "specific" | "fallback";
  /** Effective external URL of the current selection, or null (→ fallback same-origin). */
  localUrl: string | null;
}

export function isHttpsUrl(url: string): boolean {
  return /^https:\/\/\S+$/.test(url);
}

export function computeLinkPreview(args: {
  mode: LinkMode;
  existingId: string;
  casinoId: string;
  links: LinkLite[];
  newUrl: string;
}): PreviewResult {
  const { mode, existingId, casinoId, links, newUrl } = args;
  const casinoLinks = links.filter((l) => l.casinoId === casinoId);
  const mainLink = casinoLinks.find((l) => l.isActive && l.placement === "review_cta") ?? null;

  // #7 a stored selection that doesn't belong to the current casino is dropped (→ main).
  const validExistingId =
    existingId && casinoLinks.some((l) => l.id === existingId) ? existingId : "";
  const effectiveMode: LinkMode = mode === "existing" && !validExistingId ? "main" : mode;
  const selected = validExistingId
    ? casinoLinks.find((l) => l.id === validExistingId) ?? null
    : null;

  let localType: PreviewResult["localType"];
  let localUrl: string | null;
  if (effectiveMode === "main") {
    localType = mainLink ? "principal" : "fallback";
    localUrl = mainLink?.url ?? null;
  } else if (effectiveMode === "new") {
    const valid = isHttpsUrl(newUrl);
    localType = valid ? "specific" : "fallback";
    localUrl = valid ? newUrl : null;
  } else {
    // existing
    const active = Boolean(selected && selected.isActive);
    localType = active ? "specific" : "fallback";
    localUrl = active ? selected!.url : null;
  }

  return { effectiveMode, validExistingId, selected, mainLink, localType, localUrl };
}
