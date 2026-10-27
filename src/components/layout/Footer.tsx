import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { readyInstitutionalByGroup } from "@/lib/institutional";
import { company } from "@/lib/company";

const baseColumns = [
  {
    title: "Cazinouri",
    links: [
      { label: "Toate cazinourile", href: "/cazinouri-online" },
      { label: "Cazinouri noi", href: "/cazinouri-online?tag=nou" },
      { label: "Retrageri rapide", href: "/cazinouri-online?tag=retrageri-rapide" },
    ],
  },
  {
    title: "Bonusuri",
    links: [
      { label: "Toate bonusurile", href: "/bonusuri-casino" },
      { label: "Bonus fără depunere", href: "/bonusuri-casino?tip=fara-depunere" },
      { label: "Rotiri gratuite", href: "/bonusuri-casino?tip=rotiri-gratuite" },
    ],
  },
  {
    title: "Resurse",
    links: [
      { label: "Jocuri", href: "/jocuri-casino" },
      { label: "Furnizori", href: "/furnizori" },
      { label: "Ghiduri", href: "/ghiduri" },
    ],
  },
];

const toLinks = (pages: { navLabel: string; slug: string }[]) =>
  pages.map((p) => ({ label: p.navLabel, href: `/${p.slug}` }));

// Tailwind needs literal class names — map column count to a static class.
const GRID_COLS: Record<number, string> = {
  3: "lg:grid-cols-3",
  4: "lg:grid-cols-4",
  5: "lg:grid-cols-5",
};

export function Footer() {
  // "Informații" and "Legal" columns are built ONLY from ready pages in each group.
  // A not-ready page (e.g. Terms/Privacy pending legal review) is never linked here.
  const infoLinks = toLinks(readyInstitutionalByGroup("info"));
  const legalLinks = toLinks(readyInstitutionalByGroup("legal"));
  const columns = [
    ...baseColumns,
    ...(infoLinks.length ? [{ title: "Informații", links: infoLinks }] : []),
    ...(legalLinks.length ? [{ title: "Legal", links: legalLinks }] : []),
  ];
  const gridCols = GRID_COLS[columns.length] ?? "lg:grid-cols-4";

  return (
    <footer className="border-t border-border bg-footer">
      <div className="mx-auto max-w-[1600px] px-4 py-10 md:px-6">
        <div className={`grid gap-8 sm:grid-cols-2 ${gridCols}`}>
          {columns.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <h2 className="mb-3 text-sm font-semibold text-ink">{col.title}</h2>
              <ul className="flex flex-col gap-2">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="text-[13px] text-ink-secondary transition-colors hover:text-ink"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-border pt-6 text-[13px] text-ink-muted">
          <div className="flex flex-wrap items-center gap-3">
            <Badge tone="danger">18+</Badge>
            <span>Joacă responsabil. Jocurile de noroc pot crea dependență.</span>
          </div>
          <p className="max-w-[80ch] leading-relaxed">
            CasinOnline.ro este o platformă informativă. Unele linkuri sunt afiliate — putem
            primi un comision fără costuri suplimentare pentru tine. Promovăm doar operatori
            licențiați ONJN.
          </p>
          <p className="max-w-[80ch] leading-relaxed">
            Operat de {company.legalName} · Licenta ONJN de afiliat {company.onjnAffiliateLicense.label}.
          </p>
          <p>© 2026 CasinOnline.ro. Toate drepturile rezervate.</p>
        </div>
      </div>
    </footer>
  );
}
