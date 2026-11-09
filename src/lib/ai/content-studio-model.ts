/**
 * AI-2 Content Studio — PURE UI model helpers (no React, no I/O), so the Studio's decision logic is
 * unit-testable: error classification for display, and the unsaved-changes guard that protects a
 * manual edit before a regenerate.
 */

import type { GenerationErrorKind } from "@/lib/ai/generate-section";

/** Short RO label + tone for an error kind, for a clear error UI. */
export function errorLabel(kind: GenerationErrorKind): { label: string; tone: "warn" | "error" } {
  switch (kind) {
    case "no_section": return { label: "Secțiune inexistentă", tone: "error" };
    case "parse_error": return { label: "Răspuns AI invalid", tone: "error" };
    case "invalid_output": return { label: "Output respins de validare", tone: "error" };
    case "max_tokens": return { label: "Răspuns trunchiat (max_tokens)", tone: "warn" };
    case "rate_limit": return { label: "Limită de cereri", tone: "warn" };
    case "timeout": return { label: "Timeout", tone: "warn" };
    case "api_error": return { label: "Eroare provider / configurare", tone: "error" };
    default: return { label: "Eroare", tone: "error" };
  }
}

/** True when the editor content differs from the last generated/applied baseline (unsaved edits). */
export function isDirty(content: string, baseline: string): boolean {
  return content !== baseline;
}

/** Whether a regenerate must ask for confirmation first (there are unsaved manual edits). */
export function needsRegenerateConfirm(content: string, baseline: string, hasResult: boolean): boolean {
  return hasResult && isDirty(content, baseline);
}
