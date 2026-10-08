"use client";

import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { Logo } from "./Logo";
import { SidebarNav } from "./SidebarNav";

/** Mobile menu button + slide-in navigation drawer (< lg). */
export function MobileNav() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Deschide meniul"
        className="grid size-10 place-items-center rounded-sm text-ink-secondary transition-colors hover:bg-elevated hover:text-ink lg:hidden"
      >
        <Menu size={20} strokeWidth={1.9} />
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/70"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="absolute inset-y-0 left-0 flex w-[280px] max-w-[85vw] flex-col border-r border-border bg-sidebar">
            <div className="flex h-[var(--header-h)] items-center justify-between px-4">
              <Logo />
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Închide meniul"
                className="grid size-9 place-items-center rounded-sm text-ink-secondary transition-colors hover:bg-elevated hover:text-ink"
              >
                <X size={18} strokeWidth={1.9} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-3 pb-6">
              <SidebarNav onNavigate={() => setOpen(false)} />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
