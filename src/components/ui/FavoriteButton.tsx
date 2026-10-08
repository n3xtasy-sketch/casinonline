"use client";

import { useState } from "react";
import { Heart } from "lucide-react";
import { cn } from "@/lib/cn";

interface Props {
  /** Accessible name of the favorited entity (e.g. game/casino name). */
  label: string;
  defaultActive?: boolean;
  className?: string;
}

/**
 * Reusable favorite toggle (games / casinos / guides).
 * Local state for now; persistence arrives with auth (TASKS.md Phase 10).
 */
export function FavoriteButton({ label, defaultActive = false, className }: Props) {
  const [active, setActive] = useState(defaultActive);

  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={active ? `Elimină ${label} din favorite` : `Adaugă ${label} la favorite`}
      onClick={() => setActive((v) => !v)}
      className={cn(
        "grid size-8 place-items-center rounded-sm border border-border-strong bg-base/70 backdrop-blur transition-colors hover:bg-elevated",
        className,
      )}
    >
      <Heart
        size={16}
        strokeWidth={1.9}
        className={active ? "fill-danger text-danger" : "text-ink-secondary"}
      />
    </button>
  );
}
