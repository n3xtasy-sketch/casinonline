import type { EditorialRowView, EditorialFlags } from "@/lib/editorial-status";

/** Two table cells: Autor + Verificare editorială. Discreet "—" when absent (never
 *  invented). Shows a "reverificare" hint when the verification is past its window. */
export function fmtDate(iso: string | null): string {
  if (!iso) return "";
  const d = iso.slice(0, 10).split("-");
  return d.length === 3 ? `${d[2]}.${d[1]}.${d[0]}` : iso;
}

export function EditorialCells({ view, flags }: { view: EditorialRowView; flags: EditorialFlags }) {
  return (
    <>
      <td className="px-4 py-3 text-ink-secondary">
        {flags.hasAuthor ? (
          <span className="text-ink">{view.authorName ?? "necunoscut"}</span>
        ) : (
          <span className="text-ink-muted" title="Fără autor atribuit">—</span>
        )}
      </td>
      <td className="px-4 py-3 text-ink-secondary">
        {flags.isVerified ? (
          <span className="flex flex-col">
            <span className="text-ink">{view.verifierName ?? "necunoscut"}</span>
            <span className={flags.needsReverify ? "text-[11px] text-gold" : "text-[11px] text-ink-muted"}>
              {fmtDate(view.editorialVerifiedAt)}
              {flags.needsReverify ? " · reverificare" : ""}
            </span>
          </span>
        ) : (
          <span className="text-ink-muted" title="Neverificat editorial">—</span>
        )}
      </td>
    </>
  );
}
