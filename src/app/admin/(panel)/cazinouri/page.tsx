import Link from "next/link";
import { ExternalLink, Plus } from "lucide-react";
import { listAdminCasinos, type CasinoStatus } from "@/lib/db/admin-casinos";
import { CasinoStatusButton } from "@/components/admin/CasinoStatusButton";
import { cn } from "@/lib/cn";

type Filter = "all" | "active" | "archived";

const TABS: { key: Filter; label: string }[] = [
  { key: "all", label: "Toate" },
  { key: "active", label: "Active" },
  { key: "archived", label: "Arhivate" },
];

interface PageProps {
  searchParams: Promise<{ status?: string }>;
}

function StatusBadge({ status }: { status: CasinoStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        status === "active"
          ? "bg-accent/12 text-accent"
          : "bg-ink-muted/15 text-ink-muted",
      )}
    >
      {status === "active" ? "Activ" : "Arhivat"}
    </span>
  );
}

export default async function AdminCasinosPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const filter: Filter =
    sp.status === "active" || sp.status === "archived" ? sp.status : "all";
  const casinos = await listAdminCasinos(filter);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">Cazinouri</h1>
          <p className="mt-1 text-sm text-ink-secondary">
            {casinos.length} {casinos.length === 1 ? "cazino" : "cazinouri"}
          </p>
        </div>
        <Link
          href="/admin/cazinouri/nou"
          className="inline-flex h-10 items-center gap-2 rounded-sm bg-accent px-4 text-sm font-semibold text-[#06110a] transition-colors hover:bg-accent-hover"
        >
          <Plus size={16} />
          Adaugă cazino
        </Link>
      </div>

      <div className="flex gap-1">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={t.key === "all" ? "/admin/cazinouri" : `/admin/cazinouri?status=${t.key}`}
            className={cn(
              "rounded-sm px-3 py-1.5 text-sm font-medium",
              filter === t.key
                ? "bg-accent/12 text-ink"
                : "text-ink-secondary hover:bg-elevated hover:text-ink",
            )}
          >
            {t.label}
          </Link>
        ))}
      </div>

      <div className="overflow-x-auto rounded-md border border-border bg-surface">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-ink-muted">
              <th className="px-4 py-3 font-semibold">Nume</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Rating</th>
              <th className="px-4 py-3 font-semibold">Licență</th>
              <th className="px-4 py-3 font-semibold">Slug</th>
              <th className="px-4 py-3 font-semibold">Acțiuni</th>
            </tr>
          </thead>
          <tbody>
            {casinos.map((c) => (
              <tr key={c.slug} className="border-b border-border/60 last:border-0">
                <td className="px-4 py-3 font-medium text-ink">{c.name}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={c.status} />
                </td>
                <td className="px-4 py-3 tabular-nums text-ink-secondary">
                  {c.rating ? c.rating.toFixed(1) : "—"}
                </td>
                <td className="px-4 py-3 text-ink-secondary">{c.license ?? "—"}</td>
                <td className="px-4 py-3 font-mono text-xs text-ink-muted">{c.slug}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-4">
                    <Link
                      href={`/admin/cazinouri/${c.slug}/edit`}
                      className="font-medium text-accent hover:text-link-hover"
                    >
                      Editează
                    </Link>
                    <CasinoStatusButton id={c.id} name={c.name} status={c.status} />
                    {c.status === "active" ? (
                      <Link
                        href={c.reviewUrl}
                        target="_blank"
                        className="inline-flex items-center gap-1 text-ink-muted hover:text-ink"
                        title={`Vezi pagina publică ${c.name}`}
                      >
                        <ExternalLink size={14} />
                        <span className="sr-only">Vezi pagina publică {c.name}</span>
                      </Link>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
