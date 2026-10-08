import Link from "next/link";
import Image from "next/image";
import { BookOpen } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { GuideCardData } from "@/types/guide";

/**
 * Editorial guide card (DESIGN.md "Guides"): cover image + category + title + excerpt + meta.
 */
export function GuideCard({ guide }: { guide: GuideCardData }) {
  const { title, category, excerpt, imageUrl, author, updatedAt, href } = guide;

  return (
    <Link href={href} className="block h-full">
      <Card interactive padding="none" className="flex h-full flex-col overflow-hidden">
        <div className="relative aspect-[16/10] bg-gradient-to-br from-elevated to-surface">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={title}
              fill
              sizes="(max-width: 768px) 100vw, 360px"
              className="object-cover"
            />
          ) : (
            <div className="grid h-full place-items-center text-ink-disabled">
              <BookOpen size={36} strokeWidth={1.5} />
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-2 p-4">
          <Badge tone="info" className="self-start">
            {category}
          </Badge>
          <h3 className="line-clamp-2 text-base font-semibold text-ink">{title}</h3>
          <p className="line-clamp-2 text-sm text-ink-secondary">{excerpt}</p>
          <div className="mt-auto flex items-center gap-2 pt-1 text-xs text-ink-muted">
            <span className="truncate">{author}</span>
            <span aria-hidden>·</span>
            <span className="shrink-0">{updatedAt}</span>
          </div>
        </div>
      </Card>
    </Link>
  );
}
