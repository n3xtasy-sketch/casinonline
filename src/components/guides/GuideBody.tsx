import type { GuideSection } from "@/types/guide";

/** Renders guide content as H2/H3 sections with anchor ids for the table of contents. */
export function GuideBody({ sections }: { sections: GuideSection[] }) {
  return (
    <div className="flex flex-col gap-8">
      {sections.map((section) => (
        <section key={section.id} className="scroll-mt-24">
          {section.level === 2 ? (
            <h2 id={section.id} className="text-xl font-bold text-ink md:text-2xl">
              {section.heading}
            </h2>
          ) : (
            <h3 id={section.id} className="text-lg font-semibold text-ink">
              {section.heading}
            </h3>
          )}
          <div className="mt-3 flex max-w-[72ch] flex-col gap-3">
            {section.body.map((paragraph, i) => (
              <p key={i} className="leading-relaxed text-ink-secondary">
                {paragraph}
              </p>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
