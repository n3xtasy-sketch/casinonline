import Link from "next/link";

interface Props {
  title: string;
  subtitle?: string;
  action?: { label: string; href: string };
}

export function SectionHeader({ title, subtitle, action }: Props) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div className="min-w-0">
        <h2 className="text-2xl font-bold text-ink">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm text-ink-secondary">{subtitle}</p> : null}
      </div>
      {action ? (
        <Link
          href={action.href}
          className="shrink-0 text-sm font-medium text-accent transition-colors hover:text-link-hover"
        >
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}
