export interface TocItem {
  id: string;
  label: string;
}

/** Simple anchor-based table of contents (server-rendered; smooth scroll via CSS). */
export function TableOfContents({ items }: { items: TocItem[] }) {
  if (!items.length) return null;

  return (
    <nav aria-label="Cuprins" className="rounded-md border border-border bg-surface p-4">
      <p className="mb-3 text-sm font-semibold text-ink">Cuprins</p>
      <ol className="flex flex-col gap-2">
        {items.map((item, i) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              className="text-sm text-ink-secondary transition-colors hover:text-accent"
            >
              {i + 1}. {item.label}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
