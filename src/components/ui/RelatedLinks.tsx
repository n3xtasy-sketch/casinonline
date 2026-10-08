import Link from "next/link";
import { ArrowRight } from "lucide-react";

export interface RelatedLinkItem {
  label: string;
  href: string;
}

/** Reusable block of internal links (e.g. a guide pointing to casinos/games/bonuses). */
export function RelatedLinks({
  title = "Resurse utile",
  links,
}: {
  title?: string;
  links: RelatedLinkItem[];
}) {
  if (!links.length) return null;

  return (
    <div className="rounded-md border border-border bg-surface p-5">
      <h2 className="mb-3 text-base font-semibold text-ink">{title}</h2>
      <ul className="flex flex-col gap-2">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="group inline-flex items-center gap-2 text-sm text-link transition-colors hover:text-link-hover"
            >
              {link.label}
              <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
