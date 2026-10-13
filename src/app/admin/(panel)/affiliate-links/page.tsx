import Link from "next/link";
import { Plus } from "lucide-react";
import { ExportButtons } from "@/components/admin/ExportButtons";
import {
  listAffiliateLinks,
  listAllCasinos,
  type AffiliateLinkFilters,
} from "@/lib/db/admin-affiliates";
import { AFFILIATE_PLACEMENTS } from "@/lib/affiliate-placements";
import { BulkAffiliateTable } from "@/components/admin/BulkAffiliateTable";

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
        <div className="flex items-center gap-2">
          <ExportButtons entity="affiliate_links" />
          <Link
          href="/admin/affiliate-links/nou"
          className="inline-flex h-10 items-center gap-2 rounded-sm bg-accent px-4 text-sm font-semibold text-[#06110a] transition-colors hover:bg-accent-hover"
        >
          <Plus size={16} />
          Adaugă link
        </Link>
        </div>
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

      <BulkAffiliateTable rows={links} />
    </div>
  );
}
