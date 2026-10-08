import { Check, X } from "lucide-react";

/** Two-column pros & cons (DESIGN.md "Pros and cons"). Single column on mobile. */
export function ProsCons({ pros, cons }: { pros: string[]; cons: string[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="rounded-md border border-border bg-surface p-5">
        <h3 className="mb-3 text-sm font-semibold text-ink">Avantaje</h3>
        <ul className="flex flex-col gap-2">
          {pros.map((p) => (
            <li key={p} className="flex gap-2 text-sm text-ink-secondary">
              <Check size={16} className="mt-0.5 shrink-0 text-accent" />
              {p}
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-md border border-border bg-surface p-5">
        <h3 className="mb-3 text-sm font-semibold text-ink">Dezavantaje</h3>
        <ul className="flex flex-col gap-2">
          {cons.map((c) => (
            <li key={c} className="flex gap-2 text-sm text-ink-secondary">
              <X size={16} className="mt-0.5 shrink-0 text-danger" />
              {c}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
