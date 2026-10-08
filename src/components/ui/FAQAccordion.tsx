import { ChevronDown } from "lucide-react";

export interface FaqItem {
  question: string;
  answer: string;
}

/**
 * Accessible FAQ accordion built on native <details>/<summary> — keyboard-ready,
 * server-rendered, no client JS (DESIGN.md "FAQ").
 */
export function FAQAccordion({ items }: { items: FaqItem[] }) {
  return (
    <div className="flex flex-col gap-3">
      {items.map((item) => (
        <details key={item.question} className="group rounded-sm border border-border bg-panel">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-4 text-base font-semibold text-ink [&::-webkit-details-marker]:hidden">
            {item.question}
            <ChevronDown
              size={18}
              className="shrink-0 text-ink-muted transition-transform duration-[180ms] ease-out group-open:rotate-180"
            />
          </summary>
          <p className="px-4 pb-4 text-sm leading-relaxed text-ink-secondary">{item.answer}</p>
        </details>
      ))}
    </div>
  );
}
