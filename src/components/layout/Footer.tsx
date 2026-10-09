import Link from "next/link";
import { Badge } from "@/components/ui/Badge";

const columns = [
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

export function Footer() {
  return (
    <footer className="border-t border-border bg-footer">
      <div className="mx-auto max-w-[1600px] px-4 py-10 md:px-6">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
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
          <p>© 2026 CasinOnline.ro. Toate drepturile rezervate.</p>
        </div>
      </div>
    </footer>
  );
}
