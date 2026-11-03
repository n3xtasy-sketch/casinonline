/**
 * Brief editor dirty-state detection (FAZA KE-0 fix). Pure, client-safe (no imports) so it is
 * unit-testable and shared by BriefEditor. A snapshot captures every editable field PLUS the
 * locked-fields set (which drives provenance), so toggling a lock or editing any field — including
 * target_url — registers as a change the editor must not silently drop.
 */

export interface BriefEditorSnapshot {
  title: string;
  primaryKeyword: string;
  secondary: string; // textarea text (one keyword per line)
  intent: string;
  targetUrl: string;
  h1: string;
  outline: string; // textarea text
  entities: string; // textarea text
  faq: string; // textarea text
  notes: string;
  locked: string[]; // locked field keys (order-insensitive)
}

/** Order-insensitive canonical form (locked set is compared as a sorted list). */
function canonical(s: BriefEditorSnapshot): string {
  return JSON.stringify({ ...s, locked: [...s.locked].sort() });
}

/** True when the editor has unsaved changes relative to the last persisted baseline. */
export function isBriefDirty(baseline: BriefEditorSnapshot, current: BriefEditorSnapshot): boolean {
  return canonical(baseline) !== canonical(current);
}
