import Link from "next/link";
import { resolveByline } from "@/lib/editorial";

/**
 * Public editorial byline: "Scris de [Autor] · Verificat de [Verificator] · Actualizat la
 * [data]". Server component. Author/verifier names link to their public /autori profiles.
 *
 * "Verificat de" renders ONLY when a real verification is recorded (known verifier + a
 * verification date) — see resolveByline. Nothing is shown if there is no byline data.
 */
function formatDate(iso: string): string {
  const d = iso.slice(0, 10).split("-");
  return d.length === 3 ? `${d[2]}.${d[1]}.${d[0]}` : iso;
}

export interface EditorialBylineProps {
  authorSlug: string | null;
  verifierSlug: string | null;
  verifiedAt: string | null;
  updatedAt: string | null;
  className?: string;
}

export function EditorialByline({
  authorSlug,
  verifierSlug,
  verifiedAt,
  updatedAt,
  className,
}: EditorialBylineProps) {
  const b = resolveByline({ authorSlug, verifierSlug, verifiedAt, updatedAt });
  if (!b.hasByline) return null;

  return (
    <p className={`flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-ink-muted ${className ?? ""}`}>
      {b.author ? (
        <span>
          Scris de{" "}
          <Link href={b.author.href} className="font-medium text-ink-secondary hover:text-ink">
            {b.author.name}
          </Link>
        </span>
      ) : null}
      {b.verifier ? (
        <>
          {b.author ? <span aria-hidden>·</span> : null}
          <span>
            Verificat de{" "}
            <Link href={b.verifier.href} className="font-medium text-ink-secondary hover:text-ink">
              {b.verifier.name}
            </Link>
            {b.verifiedAt ? ` (${formatDate(b.verifiedAt)})` : ""}
          </span>
        </>
      ) : null}
      {b.updatedAt ? (
        <>
          {b.author || b.verifier ? <span aria-hidden>·</span> : null}
          <span>Actualizat la {formatDate(b.updatedAt)}</span>
        </>
      ) : null}
    </p>
  );
}
