import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface Props {
  title: string;
  children: ReactNode;
  className?: string;
}

/** Container for right-sidebar discovery widgets (DESIGN.md). */
export function WidgetCard({ title, children, className }: Props) {
  return (
    <section
      className={cn(
        "rounded-md border border-border bg-surface p-4 shadow-card",
        className,
      )}
    >
      <h2 className="mb-3.5 text-base font-semibold text-ink">{title}</h2>
      {children}
    </section>
  );
}
