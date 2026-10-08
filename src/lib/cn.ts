export type ClassValue = string | number | false | null | undefined;

/**
 * Minimal className joiner — concatenates truthy values.
 * Kept dependency-free on purpose (see CLAUDE.md: avoid unnecessary libraries).
 */
export function cn(...values: ClassValue[]): string {
  return values.filter(Boolean).join(" ");
}
