"use client";

import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";

interface Props {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
}

/** Centered modal dialog (DESIGN.md "Modals"). Closes on backdrop click / Escape. */
export function Modal({ open, onClose, title, children, className }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} aria-hidden />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "relative z-10 w-full max-w-[600px] rounded-xl border border-panel-border bg-panel shadow-elevated",
          className,
        )}
      >
        {title ? (
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="text-lg font-semibold text-ink">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Închide"
              className="grid size-9 place-items-center rounded-sm text-ink-secondary transition-colors hover:bg-elevated hover:text-ink"
            >
              <X size={18} strokeWidth={1.9} />
            </button>
          </div>
        ) : null}

        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
