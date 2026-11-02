/**
 * SEO brief editorial workflow (FAZA KE-0). Client-safe (no I/O). Mirrors the `status` CHECK on
 * seo_briefs (0033): draft | ready | approved | archived — a DIFFERENT state machine from the
 * content_status enum (draft/published/archived), so it lives here, not in content-status.ts.
 *
 * Rules (enforced server-side in brief-actions.ts, mirrored here for the UI):
 *   - draft → ready       : allowed only when the readiness gate passes (see briefReadinessError)
 *   - ready → approved    : editorial sign-off
 *   - ready → draft       : reopen for editing
 *   - approved → ready    : explicit reopen (editing approved content requires this first)
 *   - any → archived      : retire (frees the per-cluster unique index)
 *   - archived → draft    : restore
 *   - draft → approved and approved → draft are FORBIDDEN (must pass through ready).
 */

export type BriefStatus = "draft" | "ready" | "approved" | "archived";

export const BRIEF_STATUSES: { value: BriefStatus; label: string }[] = [
  { value: "draft", label: "Draft" },
  { value: "ready", label: "Gata de revizuire" },
  { value: "approved", label: "Aprobat" },
  { value: "archived", label: "Arhivat" },
];

export function briefStatusLabel(s: BriefStatus): string {
  return BRIEF_STATUSES.find((x) => x.value === s)?.label ?? s;
}

export interface BriefTransition {
  next: BriefStatus;
  label: string;
  tone: "accent" | "danger";
  confirm?: string;
}

/** Valid transitions from a given state. */
export function availableBriefTransitions(cur: BriefStatus): BriefTransition[] {
  switch (cur) {
    case "draft":
      return [
        { next: "ready", label: "Marchează gata", tone: "accent" },
        { next: "archived", label: "Arhivează", tone: "danger", confirm: "Arhivezi brief-ul?" },
      ];
    case "ready":
      return [
        { next: "approved", label: "Aprobă", tone: "accent" },
        { next: "draft", label: "Redeschide (draft)", tone: "danger" },
        { next: "archived", label: "Arhivează", tone: "danger", confirm: "Arhivezi brief-ul?" },
      ];
    case "approved":
      return [
        { next: "ready", label: "Redeschide", tone: "danger", confirm: "Redeschizi brief-ul aprobat pentru editare?" },
        { next: "archived", label: "Arhivează", tone: "danger", confirm: "Arhivezi brief-ul?" },
      ];
    case "archived":
      return [{ next: "draft", label: "Restaurează (draft)", tone: "accent" }];
  }
}

/** Authoritative transition matrix (server-side gate; UI derives buttons from the list above). */
export function isBriefTransitionAllowed(from: BriefStatus, to: BriefStatus): boolean {
  return availableBriefTransitions(from).some((t) => t.next === to);
}

/**
 * Readiness gate for draft → ready: a brief must have a primary keyword, a target URL, an H1 and
 * at least one H2 in the outline. Returns an RO error string, or null when ready-eligible.
 */
export function briefReadinessError(b: {
  primaryKeyword: string | null;
  targetUrl: string | null;
  h1: string | null;
  outline: { level: number }[];
}): string | null {
  if (!b.primaryKeyword?.trim()) return "Lipsește keyword-ul principal.";
  if (!b.targetUrl?.trim()) return "Lipsește URL-ul țintă.";
  if (!b.h1?.trim()) return "Lipsește H1-ul propus.";
  if (!b.outline.some((o) => o.level === 2)) return "Outline-ul nu are niciun H2.";
  return null;
}
