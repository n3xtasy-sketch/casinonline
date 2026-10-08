import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type Variant = "default" | "elevated";
type Padding = "none" | "sm" | "md" | "lg";

const surfaces: Record<Variant, string> = {
  default: "bg-surface",
  elevated: "bg-elevated",
};

const paddings: Record<Padding, string> = {
  none: "",
  sm: "p-3",
  md: "p-4",
  lg: "p-5",
};

interface Props extends HTMLAttributes<HTMLDivElement> {
  variant?: Variant;
  padding?: Padding;
  /** Adds desktop hover lift + stronger border/shadow (DESIGN.md "Card hover"). */
  interactive?: boolean;
  children: ReactNode;
}

/** Base surface container. Specialized cards (casino/game/…) build on top of this. */
export function Card({
  variant = "default",
  padding = "md",
  interactive = false,
  className,
  children,
  ...rest
}: Props) {
  return (
    <div
      className={cn(
        "rounded-md border border-border shadow-card",
        surfaces[variant],
        paddings[padding],
        interactive &&
          "transition duration-[180ms] ease-out hover:-translate-y-0.5 hover:border-border-strong hover:shadow-elevated",
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
