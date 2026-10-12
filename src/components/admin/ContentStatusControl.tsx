"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";
import { availableTransitions, type ContentStatus } from "@/lib/content-status";

interface Props {
  id: string;
  status: ContentStatus;
  action: (id: string, next: ContentStatus) => Promise<{ error?: string }>;
}

/** Publish / unpublish / archive buttons for one row, driven by the entity's action. */
export function ContentStatusControl({ id, status, action }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function run(next: ContentStatus, confirmMsg?: string) {
    if (confirmMsg && !window.confirm(confirmMsg)) return;
    start(async () => {
      const res = await action(id, next);
      if (res?.error) window.alert(res.error);
      else router.refresh();
    });
  }

  return (
    <span className="inline-flex items-center gap-3">
      {availableTransitions(status).map((t) => (
        <button
          key={t.next}
          type="button"
          disabled={pending}
          onClick={() => run(t.next, t.confirm)}
          className={cn(
            "text-sm font-medium hover:underline disabled:opacity-50",
            t.tone === "danger" ? "text-danger" : "text-accent",
          )}
        >
          {t.label}
        </button>
      ))}
    </span>
  );
}

const BADGE: Record<ContentStatus, string> = {
  draft: "bg-gold/15 text-gold",
  published: "bg-accent/12 text-accent",
  archived: "bg-ink-muted/15 text-ink-muted",
};

export function StatusBadge({ status }: { status: ContentStatus }) {
  const label = status === "draft" ? "Draft" : status === "published" ? "Publicat" : "Arhivat";
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", BADGE[status])}>
      {label}
    </span>
  );
}
