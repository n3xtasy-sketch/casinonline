import Link from "next/link";
import { listActivity, listActivityActors, type ActivityFilters } from "@/lib/db/activity";
import { ACTIVITY_ACTIONS, ACTIVITY_ENTITY_TYPES, actionLabel, entityTypeLabel } from "@/lib/activity";

const selectCls =
  "h-9 rounded-sm border border-border bg-field px-2 text-sm text-ink outline-none focus-visible:border-accent";

interface PageProps {
  searchParams: Promise<{
    actor?: string;
    action?: string;
    entity?: string;
    from?: string;
    to?: string;
    page?: string;
  }>;
}

function qs(params: Record<string, string | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) sp.set(k, v);
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export default async function AdminActivityPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const filters: ActivityFilters = {
    actor: sp.actor || undefined,
    action: sp.action || undefined,
    entity: sp.entity || undefined,
    from: sp.from || undefined,
    to: sp.to || undefined,
  };
  const page = Math.max(1, Number(sp.page) || 1);
  const [{ rows, total, pageSize }, actors] = await Promise.all([
    listActivity(filters, page),
    listActivityActors(),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const base = { actor: sp.actor, action: sp.action, entity: sp.entity, from: sp.from, to: sp.to };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Activity Log</h1>
        <p className="mt-1 text-sm text-ink-secondary">{total} intrări · append-only.</p>
      </div>

      <form method="get" className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs text-ink-secondary">
          Actor
          <select name="actor" defaultValue={sp.actor ?? ""} className={selectCls}>
            <option value="">Toți</option>
            {actors.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-ink-secondary">
          Acțiune
          <select name="action" defaultValue={sp.action ?? ""} className={selectCls}>
            <option value="">Toate</option>
            {ACTIVITY_ACTIONS.map((a) => (
              <option key={a.value} value={a.value}>{a.label}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-ink-secondary">
          Entitate
          <select name="entity" defaultValue={sp.entity ?? ""} className={selectCls}>
            <option value="">Toate</option>
            {ACTIVITY_ENTITY_TYPES.map((e) => (
              <option key={e.value} value={e.value}>{e.label}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-ink-secondary">
          De la
          <input type="date" name="from" defaultValue={sp.from ?? ""} className={selectCls} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-ink-secondary">
          Până la
          <input type="date" name="to" defaultValue={sp.to ?? ""} className={selectCls} />
        </label>
        <button type="submit" className="h-9 rounded-sm border border-border px-3 text-sm font-medium text-ink hover:bg-elevated">
          Filtrează
        </button>
        <Link href="/admin/activity" className="h-9 self-end px-2 text-sm text-ink-secondary hover:text-ink">
          Reset
        </Link>
      </form>

      <div className="overflow-x-auto rounded-md border border-border bg-surface">
        <table className="w-full min-w-[820px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-ink-muted">
              <th className="px-4 py-3 font-semibold">Când</th>
              <th className="px-4 py-3 font-semibold">Actor</th>
              <th className="px-4 py-3 font-semibold">Acțiune</th>
              <th className="px-4 py-3 font-semibold">Entitate</th>
              <th className="px-4 py-3 font-semibold">Detalii</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-border/60 last:border-0">
                <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-ink-muted">
                  {r.createdAt.replace("T", " ").slice(0, 16)}
                </td>
                <td className="px-4 py-3 text-ink-secondary">{r.actorEmail}</td>
                <td className="px-4 py-3 text-ink">{actionLabel(r.action)}</td>
                <td className="px-4 py-3 text-ink-secondary">{entityTypeLabel(r.entityType)}</td>
                <td className="px-4 py-3 text-ink-secondary">{r.label || "—"}</td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-ink-muted">
                  Nicio intrare pentru filtrele curente.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="text-ink-muted">Pagina {page} din {totalPages}</span>
        <div className="flex gap-2">
          {page > 1 ? (
            <Link href={`/admin/activity${qs({ ...base, page: String(page - 1) })}`} className="rounded-sm border border-border px-3 py-1.5 text-ink hover:bg-elevated">
              ← Anterioară
            </Link>
          ) : null}
          {page < totalPages ? (
            <Link href={`/admin/activity${qs({ ...base, page: String(page + 1) })}`} className="rounded-sm border border-border px-3 py-1.5 text-ink hover:bg-elevated">
              Următoarea →
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
