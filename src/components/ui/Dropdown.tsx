"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

interface DropdownProps {
  /** Trigger content (text/icon) — rendered inside the toggle button. */
  trigger: ReactNode;
  children: ReactNode;
  align?: "start" | "end";
  className?: string;
  triggerClassName?: string;
}

/** Click-to-open menu (DESIGN.md "Dropdowns"). Closes on outside click / Escape. */
export function Dropdown({
  trigger,
  children,
  align = "start",
  className,
  triggerClassName,
}: DropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className={cn("relative inline-flex", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={triggerClassName}
      >
        {trigger}
      </button>

      {open ? (
        <div
          role="menu"
          className={cn(
            "absolute top-[calc(100%+6px)] z-50 min-w-[200px] overflow-hidden rounded-sm border border-panel-border bg-panel p-1 shadow-elevated",
            align === "end" ? "right-0" : "left-0",
          )}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}

interface ItemProps {
  children: ReactNode;
  onClick?: () => void;
  active?: boolean;
}

export function DropdownItem({ children, onClick, active = false }: ItemProps) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 rounded-[7px] px-3 py-2 text-left text-sm transition-colors",
        active
          ? "bg-accent/12 text-ink"
          : "text-ink-secondary hover:bg-elevated hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}
