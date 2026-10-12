import Link from "next/link";
import { Plus } from "lucide-react";
import { listAdminBonuses } from "@/lib/db/admin-bonuses";

/** Bonus listing (Admin). Uses the admin reader so bonuses of archived casinos
 * stay visible/editable even though the public site hides them. */
export default async function AdminBonusesPage() {
  const bonuses = await listAdminBonuses();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">Bonusuri</h1>
          <p className="mt-1 text-sm text-ink-secondary">
            {bonuses.length} {bonuses.length === 1 ? "bonus" : "bonusuri"}
          </p>
        </div>
        <Link
          href="/admin/bonusuri/nou"
          className="inline-flex h-10 items-center gap-2 rounded-sm bg-accent px-4 text-sm font-semibold text-[#06110a] transition-colors hover:bg-accent-hover"
        >
          <Plus size={16} />
          Adaugă bonus
        </Link>
      </div>

      <div className="overflow-x-auto rounded-md border border-border bg-surface">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-ink-muted">
              <th className="px-4 py-3 font-semibold">Ofertă</th>
              <th className="px-4 py-3 font-semibold">Tip</th>
              <th className="px-4 py-3 font-semibold">Cazino</th>
              <th className="px-4 py-3 font-semibold">Free spins</th>
              <th className="px-4 py-3 font-semibold">Slug</th>
              <th className="px-4 py-3 font-semibold">Acțiuni</th>
            </tr>
          </thead>
          <tbody>
            {bonuses.map((b) => (
              <tr key={b.slug} className="border-b border-border/60 last:border-0">
                <td className="px-4 py-3 font-medium text-ink">{b.offer}</td>
                <td className="px-4 py-3 text-ink-secondary">{b.bonusType || "—"}</td>
                <td className="px-4 py-3 text-ink-secondary">
                  {b.casinoName}
                  {b.casinoArchived ? (
                    <span className="ml-2 inline-flex items-center rounded-full bg-ink-muted/15 px-2 py-0.5 text-xs font-medium text-ink-muted">
                      cazino arhivat
                    </span>
                  ) : null}
                </td>
                <td className="px-4 py-3 tabular-nums text-ink-secondary">{b.freeSpins ?? "—"}</td>
                <td className="px-4 py-3 font-mono text-xs text-ink-muted">{b.slug}</td>
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/bonusuri/${b.slug}/edit`}
                    className="font-medium text-accent hover:text-link-hover"
                  >
                    Editează
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
