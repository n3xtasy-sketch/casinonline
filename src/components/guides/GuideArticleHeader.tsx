import Image from "next/image";
import { BookOpen, User, Clock } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import type { GuideDetail } from "@/types/guide";

/** Header for a guide article: category, title, author/updated meta, cover image. */
export function GuideArticleHeader({ guide }: { guide: GuideDetail }) {
  const { title, category, author, updatedAt, imageUrl, readingTime } = guide;

  return (
    <header className="flex flex-col gap-4">
      <Badge tone="info" className="self-start">
        {category}
      </Badge>

      <h1 className="text-balance text-3xl font-bold leading-tight text-ink md:text-4xl">
        {title}
      </h1>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-muted">
        <span className="inline-flex items-center gap-1.5">
          <User size={14} /> {author}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Clock size={14} /> Actualizat {updatedAt}
        </span>
        {readingTime ? <span>· {readingTime} citire</span> : null}
      </div>

      <div className="relative aspect-[16/9] overflow-hidden rounded-xl border border-border bg-gradient-to-br from-elevated to-surface">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={title}
            fill
            sizes="(max-width: 768px) 100vw, 800px"
            className="object-cover"
          />
        ) : (
          <div className="grid h-full place-items-center text-ink-disabled">
            <BookOpen size={48} strokeWidth={1.5} />
          </div>
        )}
      </div>
    </header>
  );
}
