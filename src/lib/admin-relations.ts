/**
 * Pure helpers for Admin multi-select relations (junction tables). Shared by the
 * edit readers (which selections to preload) and the form checkbox groups (which
 * boxes are checked). Kept pure + unit-testable.
 */

/** Map junction embed rows (e.g. `[{tag_id}]`) to the list of selected ids. */
export function selectedJunctionIds<K extends string>(
  rows: ReadonlyArray<Record<K, string>> | null | undefined,
  column: K,
): string[] {
  return (rows ?? [])
    .map((r) => r[column])
    .filter((v): v is string => typeof v === "string" && v.length > 0);
}

/** Is an option currently selected? (drives the checkbox checked state). */
export function isOptionChecked(selected: readonly string[], id: string): boolean {
  return selected.includes(id);
}

/** Toggle an id in a selection set (add if absent, remove if present). */
export function toggleSelection(selected: readonly string[], id: string): string[] {
  return selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id];
}
