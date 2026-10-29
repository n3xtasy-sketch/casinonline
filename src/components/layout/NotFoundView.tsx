import Link from "next/link";
import { SearchX } from "lucide-react";
import { Button } from "@/components/ui/Button";

const quickLinks = [
  { label: "Cazinouri", href: "/cazinouri-online" },
  { label: "Bonusuri", href: "/bonusuri" },
  { label: "Jocuri", href: "/pacanele-online" },
  { label: "Furnizori", href: "/furnizori" },
  { label: "Ghiduri", href: "/ghiduri" },
];

/** Shared 404 content (used by the root and the public (site) not-found boundaries). */
export function NotFoundView() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 py-16 text-center">
      <span className="grid size-16 place-items-center rounded-xl border border-border bg-elevated text-ink-muted">
        <SearchX size={32} strokeWidth={1.5} />
      </span>

      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.08em] text-accent">Eroare 404</p>
        <h1 className="mt-2 text-2xl font-bold text-ink md:text-3xl">Pagina nu a fost găsită</h1>
        <p className="mx-auto mt-3 max-w-[48ch] text-ink-secondary">
          Ne pare rău, pagina pe care o cauți nu există sau a fost mutată. Încearcă una dintre
          secțiunile de mai jos.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button href="/">Înapoi acasă</Button>
        <Button variant="secondary" href="/cazinouri-online">
          Vezi cazinourile
        </Button>
      </div>

      <nav
        aria-label="Linkuri rapide"
        className="mt-2 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm"
      >
        {quickLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="text-ink-muted transition-colors hover:text-ink"
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
