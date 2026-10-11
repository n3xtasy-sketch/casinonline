import Link from "next/link";
import { Plus } from "lucide-react";
import { getGuides } from "@/lib/db/guides";

/** Guide listing (Admin). Create + Edit; no delete in this phase. */
export default async function AdminGuidesPage() {
  const guides = await getGuides();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">Ghiduri</h1>
          <p className="mt-1 text-sm text-ink-secondary">
            {guides.length} {guides.length === 1 ? "ghid" : "ghiduri"}
          </p>
        </div>
        <Link
          href="/admin/ghiduri/nou"
          className="inline-flex h-10 items-center gap-2 rounded-sm bg-accent px-4 text-sm font-semibold text-[#06110a] transition-colors hover:bg-accent-hover"
        >
          <Plus size={16} />
          Adaugă ghid
        </Link>
      </div>

      <div className="overflow-x-auto rounded-md border border-border bg-surface">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-ink-muted">
              <th className="px-4 py-3 font-semibold">Titlu</th>
              <th className="px-4 py-3 font-semibold">Categorie</th>
              <th className="px-4 py-3 font-semibold">Autor</th>
              <th className="px-4 py-3 font-semibold">Slug</th>
              <th className="px-4 py-3 font-semibold">Acțiuni</th>
            </tr>
          </thead>
          <tbody>
            {guides.map((g) => (
              <tr key={g.slug} className="border-b border-border/60 last:border-0">
                <td className="px-4 py-3 font-medium text-ink">{g.title}</td>
                <td className="px-4 py-3 text-ink-secondary">{g.category || "—"}</td>
                <td className="px-4 py-3 text-ink-secondary">{g.author || "—"}</td>
                <td className="px-4 py-3 font-mono text-xs text-ink-muted">{g.slug}</td>
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/ghiduri/${g.slug}/edit`}
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
