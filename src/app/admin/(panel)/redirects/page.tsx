import Link from "next/link";
import { Plus } from "lucide-react";
import { listRedirects } from "@/lib/db/admin-redirects";
import { RedirectActiveButton } from "@/components/admin/RedirectActiveButton";

export default async function AdminRedirectsPage() {
  const rows = await listRedirects();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">Redirects</h1>
          <p className="mt-1 text-sm text-ink-secondary">
            {rows.length} {rows.length === 1 ? "redirect" : "redirecturi"}
          </p>
        </div>
        <Link
          href="/admin/redirects/nou"
          className="inline-flex h-10 items-center gap-2 rounded-sm bg-accent px-4 text-sm font-semibold text-[#06110a] transition-colors hover:bg-accent-hover"
        >
          <Plus size={16} />
          Adaugă redirect
        </Link>
      </div>

      <div className="overflow-x-auto rounded-md border border-border bg-surface">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-ink-muted">
              <th className="px-4 py-3 font-semibold">De la</th>
              <th className="px-4 py-3 font-semibold">Către</th>
              <th className="px-4 py-3 font-semibold">Cod</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Notă</th>
              <th className="px-4 py-3 font-semibold">Acțiuni</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-border/60 last:border-0">
                <td className="px-4 py-3 font-mono text-xs text-ink">{r.fromPath}</td>
                <td className="px-4 py-3 font-mono text-xs text-ink-secondary">{r.toPath}</td>
                <td className="px-4 py-3 tabular-nums text-ink-secondary">{r.statusCode}</td>
                <td className="px-4 py-3">
                  <span
                    className={
                      r.isActive
                        ? "inline-flex items-center rounded-full bg-accent/12 px-2 py-0.5 text-xs font-medium text-accent"
                        : "inline-flex items-center rounded-full bg-ink-muted/15 px-2 py-0.5 text-xs font-medium text-ink-muted"
                    }
                  >
                    {r.isActive ? "Activ" : "Inactiv"}
                  </span>
                </td>
                <td className="px-4 py-3 text-ink-secondary">{r.note || "—"}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-4">
                    <Link href={`/admin/redirects/${r.id}/edit`} className="font-medium text-accent hover:text-link-hover">
                      Editează
                    </Link>
                    <RedirectActiveButton id={r.id} isActive={r.isActive} />
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-ink-muted">
                  Niciun redirect încă.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
