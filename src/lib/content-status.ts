/** Shared publishing state (mirrors the content_status Postgres enum). Client-safe. */

export type ContentStatus = "draft" | "published" | "archived";

export const CONTENT_STATUSES: { value: ContentStatus; label: string }[] = [
  { value: "draft", label: "Draft" },
  { value: "published", label: "Publicat" },
  { value: "archived", label: "Arhivat" },
];

export function statusLabel(s: ContentStatus): string {
  return CONTENT_STATUSES.find((x) => x.value === s)?.label ?? s;
}

export interface StatusTransition {
  next: ContentStatus;
  label: string;
  tone: "accent" | "danger";
  confirm?: string;
}

/** Valid transitions from a given state (publish / unpublish / archive). */
export function availableTransitions(cur: ContentStatus): StatusTransition[] {
  switch (cur) {
    case "draft":
      return [{ next: "published", label: "Publică", tone: "accent" }];
    case "published":
      return [
        { next: "draft", label: "Retrage (draft)", tone: "danger", confirm: "Retragi din public (draft)?" },
        { next: "archived", label: "Arhivează", tone: "danger", confirm: "Arhivezi? Nu va mai fi vizibil public." },
      ];
    case "archived":
      return [{ next: "published", label: "Republică", tone: "accent" }];
  }
}
