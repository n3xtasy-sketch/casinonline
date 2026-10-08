import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Tone = "neutral" | "accent" | "gold" | "danger" | "info";

const tones: Record<Tone, string> = {
  neutral: "bg-elevated text-ink-secondary",
  accent: "bg-accent/12 text-accent",
  gold: "bg-gold/12 text-gold",
  danger: "bg-danger/12 text-danger",
  info: "bg-info/12 text-info",
};

interface Props {
  tone?: Tone;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** Compact status/label pill (DESIGN.md "Casino badges"): 24px tall, subtle tone, pill radius. */
export function Badge({ tone = "neutral", icon, children, className }: Props) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1 rounded-full px-2.5 text-[11px] font-semibold",
        tones[tone],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}
