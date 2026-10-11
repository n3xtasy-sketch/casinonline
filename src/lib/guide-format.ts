/**
 * Pure helpers for guide content — shared by the public reader, the admin reader
 * and the admin server action. No server-only / client-only bindings here.
 */

import type { GuideSection, GuideRelatedLink } from "@/types/guide";

/** Internal-path guard for related links (single leading slash, no host/protocol). */
export function isSafeInternalPath(href: unknown): boolean {
  return (
    typeof href === "string" &&
    !/[\u0000-\u001f\u007f\\]/.test(href) && // control chars (tab/newline/CR) + backslash
    /^\/(?![/\\])/.test(href) // single leading slash, not // or /\
  );
}

const DIACRITICS: Record<string, string> = {
  ă: "a", â: "a", î: "i", ș: "s", ş: "s", ț: "t", ţ: "t",
  Ă: "a", Â: "a", Î: "i", Ș: "s", Ş: "s", Ț: "t", Ţ: "t",
};

/** kebab-case slug from a heading (Romanian diacritics → ascii). */
export function slugify(input: string): string {
  return input
    .replace(/[ăâîșşțţĂÂÎȘŞȚŢ]/g, (c) => DIACRITICS[c] ?? c)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/* ---------------- sections: markdown-ish text <-> structured JSON ---------------- */

/**
 * Parse the admin "markdown-ish" sections textarea into GuideSection[].
 * `## ` → H2, `### ` → H3; blank line separates paragraphs; ids auto-generated
 * from headings (deduped). Returns an error string when content doesn't start
 * with a heading.
 */
export function parseSections(text: string): { sections: GuideSection[]; error: string | null } {
  const lines = String(text ?? "").replace(/\r\n/g, "\n").split("\n");
  const sections: GuideSection[] = [];
  const usedIds = new Set<string>();
  let current: GuideSection | null = null;
  let paragraph: string[] = [];

  const flushParagraph = () => {
    if (current && paragraph.length) {
      current.body.push(paragraph.join(" ").trim());
    }
    paragraph = [];
  };
  const uniqueId = (heading: string) => {
    const base = slugify(heading) || "sectiune";
    let id = base;
    let n = 2;
    while (usedIds.has(id)) id = `${base}-${n++}`;
    usedIds.add(id);
    return id;
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    const h = /^(#{2,3})\s+(.+)$/.exec(line.trim());
    if (h) {
      flushParagraph();
      if (current) sections.push(current);
      const heading = h[2].trim();
      current = { id: uniqueId(heading), heading, level: h[1].length === 3 ? 3 : 2, body: [] };
      continue;
    }
    if (line.trim() === "") {
      flushParagraph();
      continue;
    }
    if (!current) {
      return {
        sections: [],
        error: "Secțiunile trebuie să înceapă cu un titlu (## Titlu). Vezi exemplul din formular.",
      };
    }
    paragraph.push(line.trim());
  }
  flushParagraph();
  if (current) sections.push(current);

  return { sections, error: null };
}

/** Serialize GuideSection[] back to the markdown-ish textarea text (round-trip). */
export function serializeSections(sections: GuideSection[] | null | undefined): string {
  return (sections ?? [])
    .map((s) => {
      const hashes = s.level === 3 ? "###" : "##";
      const body = (s.body ?? []).join("\n\n");
      return body ? `${hashes} ${s.heading}\n${body}` : `${hashes} ${s.heading}`;
    })
    .join("\n\n");
}

/* ---------------- related links: "href | label" lines <-> JSON ---------------- */

/**
 * Parse "href | label" lines into GuideRelatedLink[]. Collects any hrefs that are
 * not safe internal paths so the action can reject the save with a clear message.
 */
export function parseRelatedLinks(text: string): {
  links: GuideRelatedLink[];
  invalid: string[];
} {
  const links: GuideRelatedLink[] = [];
  const invalid: string[] = [];
  for (const line of String(text ?? "").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const [hrefPart, ...rest] = trimmed.split("|");
    const href = (hrefPart ?? "").trim();
    const label = rest.join("|").trim();
    if (!href || !label) continue;
    if (!isSafeInternalPath(href)) {
      invalid.push(href);
      continue;
    }
    links.push({ href, label });
  }
  return { links, invalid };
}

/** Serialize GuideRelatedLink[] back to "href | label" lines. */
export function serializeRelatedLinks(links: GuideRelatedLink[] | null | undefined): string {
  return (links ?? []).map((l) => `${l.href} | ${l.label}`).join("\n");
}
