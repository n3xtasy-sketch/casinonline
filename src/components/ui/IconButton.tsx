import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  /** Accessible label (icon-only button). */
  label: string;
  children: ReactNode;
};

export function IconButton({ label, children, className, ...rest }: Props) {
  return (
    <button
      type="button"
      aria-label={label}
      className={cn(
        "grid size-10 place-items-center rounded-sm text-ink-secondary transition-colors hover:bg-elevated hover:text-ink",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
