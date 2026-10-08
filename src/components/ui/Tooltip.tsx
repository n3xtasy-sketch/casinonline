import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface Props {
  content: ReactNode;
  children: ReactNode;
  className?: string;
}

/**
 * CSS-only tooltip (hover + focus-within), no client JS (DESIGN.md "Tooltips").
 * Positioned above the trigger.
 */
export function Tooltip({ content, children, className }: Props) {
  return (
    <span className={cn("group/tooltip relative inline-flex", className)}>
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-[calc(100%+8px)] left-1/2 z-50 w-max max-w-[220px] -translate-x-1/2 scale-95 rounded-xs bg-tooltip px-2.5 py-1.5 text-xs font-medium text-ink opacity-0 shadow-elevated transition duration-[150ms] ease-out group-hover/tooltip:scale-100 group-hover/tooltip:opacity-100 group-focus-within/tooltip:scale-100 group-focus-within/tooltip:opacity-100"
      >
        {content}
      </span>
    </span>
  );
}
