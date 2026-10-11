import Link from "next/link";
import { Plus } from "lucide-react";
import { getGames } from "@/lib/db/games";

/** Game listing (Admin). Create + Edit; no delete in this phase. */
export default async function AdminGamesPage() {
  const games = await getGames();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">Jocuri</h1>
          <p className="mt-1 text-sm text-ink-secondary">
            {games.length} {games.length === 1 ? "joc" : "jocuri"}
          </p>
        </div>
        <Link
          href="/admin/jocuri/nou"
          className="inline-flex h-10 items-center gap-2 rounded-sm bg-accent px-4 text-sm font-semibold text-[#06110a] transition-colors hover:bg-accent-hover"
        >
          <Plus size={16} />
          Adaugă joc
        </Link>
      </div>

      <div className="overflow-x-auto rounded-md border border-border bg-surface">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-ink-muted">
              <th className="px-4 py-3 font-semibold">Nume</th>
              <th className="px-4 py-3 font-semibold">Furnizor</th>
              <th className="px-4 py-3 font-semibold">RTP</th>
              <th className="px-4 py-3 font-semibold">Volatilitate</th>
              <th className="px-4 py-3 font-semibold">Slug</th>
              <th className="px-4 py-3 font-semibold">Acțiuni</th>
            </tr>
          </thead>
          <tbody>
            {games.map((g) => (
              <tr key={g.slug} className="border-b border-border/60 last:border-0">
                <td className="px-4 py-3 font-medium text-ink">{g.name}</td>
                <td className="px-4 py-3 text-ink-secondary">{g.provider || "—"}</td>
                <td className="px-4 py-3 tabular-nums text-ink-secondary">{g.rtp != null ? `${g.rtp}%` : "—"}</td>
                <td className="px-4 py-3 text-ink-secondary">{g.volatility || "—"}</td>
                <td className="px-4 py-3 font-mono text-xs text-ink-muted">{g.slug}</td>
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/jocuri/${g.slug}/edit`}
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
