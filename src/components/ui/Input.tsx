import type { InputHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  /** Optional field label (wraps the control in a <label>). */
  label?: string;
  /** Optional leading icon. */
  icon?: ReactNode;
  wrapperClassName?: string;
}

/**
 * Generic form input (DESIGN.md "Inputs"). Distinct from the header SearchInput.
 */
export function Input({ label, icon, id, className, wrapperClassName, ...rest }: Props) {
  const control = (
    <div className="relative">
      {icon ? (
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted">
          {icon}
        </span>
      ) : null}
      <input
        id={id}
        className={cn(
          "h-[42px] w-full rounded-sm border border-field-border bg-field px-3 text-sm text-ink outline-none transition-colors placeholder:text-ink-muted focus:border-accent disabled:opacity-50",
          icon ? "pl-10" : null,
          className,
        )}
        {...rest}
      />
    </div>
  );

  if (!label) return control;

  return (
    <label htmlFor={id} className={cn("flex flex-col gap-1.5", wrapperClassName)}>
      <span className="text-sm font-medium text-ink-secondary">{label}</span>
      {control}
    </label>
  );
}
