import Link from "next/link";
import { Plus } from "lucide-react";
import {
  listAffiliateLinks,
  listAllCasinos,
  type AffiliateLinkFilters,
} from "@/lib/db/admin-affiliates";
import { placementLabel, AFFILIATE_PLACEMENTS } from "@/lib/affiliate-placements";
import { AffiliateActiveButton } from "@/components/admin/AffiliateActiveButton";

const selectCls =
  "h-9 rounded-sm border border-border bg-field px-2 text-sm text-ink outline-none focus-visible:border-accent";

interface PageProps {
  searchParams: Promise<{ casino?: string; active?: string; placement?: string }>;
}

export default async function AdminAffiliateLinksPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const filters: AffiliateLinkFilters = {
    casinoId: sp.casino || undefined,
    active: sp.active === "active" || sp.active === "inactive" ? sp.active : undefined,
    placement: sp.placement || undefined,
  };
  const [links, casinos] = await Promise.all([listAffiliateLinks(filters), listAllCasinos()]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">Affiliate Links</h1>
          <p className="mt-1 text-sm text-ink-secondary">
            {links.length} {links.length === 1 ? "link" : "linkuri"}
          </p>
        </div>
        <Link
          href="/admin/affiliate-links/nou"
          className="inline-flex h-10 items-center gap-2 rounded-sm bg-accent px-4 text-sm font-semibold text-[#06110a] transition-colors hover:bg-accent-hover"
        >
          <Plus size={16} />
          Adaugă link
        </Link>
      </div>

      <form method="get" className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs text-ink-secondary">
          Cazino
          <select name="casino" defaultValue={sp.casino ?? ""} className={selectCls}>
            <option value="">Toate</option>
            {casinos.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-ink-secondary">
          Status
          <select name="active" defaultValue={sp.active ?? ""} className={selectCls}>
            <option value="">Toate</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-ink-secondary">
          Placement
          <select name="placement" defaultValue={sp.placement ?? ""} className={selectCls}>
            <option value="">Toate</option>
            {AFFILIATE_PLACEMENTS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="h-9 rounded-sm border border-border px-3 text-sm font-medium text-ink hover:bg-elevated">
          Filtrează
        </button>
        <Link href="/admin/affiliate-links" className="h-9 self-end px-2 text-sm text-ink-secondary hover:text-ink">
          Reset
        </Link>
      </form>

      <div className="overflow-x-auto rounded-md border border-border bg-surface">
        <table className="w-full min-w-[820px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-ink-muted">
              <th className="px-4 py-3 font-semibold">Cazino</th>
              <th className="px-4 py-3 font-semibold">Placement</th>
              <th className="px-4 py-3 font-semibold">URL</th>
              <th className="px-4 py-3 font-semibold">Campanie</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Acțiuni</th>
            </tr>
          </thead>
          <tbody>
            {links.map((l) => (
              <tr key={l.id} className="border-b border-border/60 last:border-0">
                <td className="px-4 py-3 font-medium text-ink">{l.casinoName}</td>
                <td className="px-4 py-3 text-ink-secondary">{placementLabel(l.placement)}</td>
                <td className="max-w-[240px] truncate px-4 py-3 font-mono text-xs text-ink-muted" title={l.url}>
                  {l.url}
                </td>
                <td className="px-4 py-3 text-ink-secondary">{l.campaign || "—"}</td>
                <td className="px-4 py-3">
                  <span
                    className={
                      l.isActive
                        ? "inline-flex items-center rounded-full bg-accent/12 px-2 py-0.5 text-xs font-medium text-accent"
                        : "inline-flex items-center rounded-full bg-ink-muted/15 px-2 py-0.5 text-xs font-medium text-ink-muted"
                    }
                  >
                    {l.isActive ? "Activ" : "Inactiv"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-4">
                    <Link
                      href={`/admin/affiliate-links/${l.id}/edit`}
                      className="font-medium text-accent hover:text-link-hover"
                    >
                      Editează
                    </Link>
                    <AffiliateActiveButton
                      id={l.id}
                      isActive={l.isActive}
                      label={`${l.casinoName} · ${placementLabel(l.placement)}`}
                    />
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
