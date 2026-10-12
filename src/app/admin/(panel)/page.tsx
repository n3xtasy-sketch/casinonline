import Link from "next/link";
import { getDashboardData, type HealthRule, type Severity } from "@/lib/db/admin-dashboard";

const SEVERITY: Record<Severity, { label: string; dot: string; badge: string }> = {
  high: { label: "Critice", dot: "bg-danger", badge: "bg-danger/15 text-danger" },
  medium: { label: "De completat", dot: "bg-gold", badge: "bg-gold/15 text-gold" },
  info: { label: "Info", dot: "bg-ink-muted", badge: "bg-ink-muted/15 text-ink-muted" },
};

function CountCard({ label, value, sub, href }: { label: string; value: number; sub?: string; href: string }) {
  return (
    <Link
      href={href}
      className="rounded-md border border-border bg-surface p-5 shadow-card transition-colors hover:border-accent/40"
    >
      <p className="text-sm text-ink-secondary">{label}</p>
      <p className="mt-1 text-3xl font-bold tabular-nums text-ink">{value}</p>
      {sub ? <p className="mt-1 text-xs text-ink-muted">{sub}</p> : null}
    </Link>
  );
}

function RuleBlock({ rule }: { rule: HealthRule }) {
  const sev = SEVERITY[rule.severity];
  const LIMIT = 50;
  const shown = rule.items.slice(0, LIMIT);
  const extra = rule.items.length - shown.length;
  return (
    <details className="rounded-md border border-border bg-surface">
      <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3">
        <span className={`h-2 w-2 shrink-0 rounded-full ${sev.dot}`} />
        <span className="flex-1 text-sm font-medium text-ink">{rule.title}</span>
        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${sev.badge}`}>
          {rule.items.length}
        </span>
      </summary>
      <div className="border-t border-border px-4 py-3">
        <p className="mb-3 text-xs text-ink-muted">{rule.hint}</p>
        <ul className="flex flex-col gap-1.5">
          {shown.map((it, i) => (
            <li key={`${it.href}-${i}`}>
              <Link href={it.href} className="text-sm text-accent hover:text-link-hover">
                {it.label}
              </Link>
            </li>
          ))}
        </ul>
        {extra > 0 ? <p className="mt-2 text-xs text-ink-muted">+ încă {extra}…</p> : null}
      </div>
    </details>
  );
}

export default async function AdminDashboard() {
  const { counts, rules } = await getDashboardData();

  const cards = [
    {
      label: "Cazinouri",
      value: counts.casinosActive + counts.casinosArchived,
      sub: `${counts.casinosActive} publicate · ${counts.casinosArchived} arhivate`,
      href: "/admin/cazinouri",
    },
    { label: "Bonusuri", value: counts.bonuses, href: "/admin/bonusuri" },
    { label: "Jocuri", value: counts.games, href: "/admin/jocuri" },
    { label: "Furnizori", value: counts.providers, href: "/admin/furnizori" },
    { label: "Metode de plată", value: counts.payments, href: "/admin/metode-de-plata" },
    { label: "Ghiduri", value: counts.guides, href: "/admin/ghiduri" },
    {
      label: "Affiliate links active",
      value: counts.affiliateActive,
      href: "/admin/affiliate-links?active=active",
    },
  ];

  const withIssues = rules.filter((r) => r.items.length > 0);
  const clean = rules.filter((r) => r.items.length === 0);
  const totalIssues = withIssues.reduce((n, r) => n + r.items.length, 0);
  const order: Severity[] = ["high", "medium", "info"];
  const grouped = order
    .map((sev) => ({ sev, list: withIssues.filter((r) => r.severity === sev) }))
    .filter((g) => g.list.length > 0);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold text-ink">Dashboard</h1>
        <p className="mt-1 text-sm text-ink-secondary">Sumar conținut + verificări de calitate.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {cards.map((c) => (
          <CountCard key={c.label} {...c} />
        ))}
      </div>

      <section className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold text-ink">Content Quality / Health</h2>
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold tabular-nums ${
              totalIssues === 0 ? "bg-accent/15 text-accent" : "bg-danger/15 text-danger"
            }`}
          >
            {totalIssues === 0 ? "Totul curat" : `${totalIssues} de rezolvat`}
          </span>
        </div>

        {grouped.map((g) => (
          <div key={g.sev} className="flex flex-col gap-2">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">
              <span className={`h-2 w-2 rounded-full ${SEVERITY[g.sev].dot}`} />
              {SEVERITY[g.sev].label}
            </p>
            {g.list.map((r) => (
              <RuleBlock key={r.key} rule={r} />
            ))}
          </div>
        ))}

        {clean.length > 0 ? (
          <div className="flex flex-col gap-1.5 rounded-md border border-border bg-surface p-4">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-muted">
              Fără probleme
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {clean.map((r) => (
                <span key={r.key} className="text-sm text-ink-secondary">
                  ✓ {r.title}
                </span>
              ))}
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
