import { Star, StarHalf } from "lucide-react";
import { cn } from "@/lib/cn";

interface Props {
  /** Rating value on the `max` scale. */
  value: number;
  max?: number;
  size?: number;
  /** Show numeric "4.8 / 5" label next to the stars. */
  showValue?: boolean;
  className?: string;
}

/** Gold star rating (DESIGN.md "Review score"). Renders full / half / empty stars. */
export function RatingStars({
  value,
  max = 5,
  size = 15,
  showValue = false,
  className,
}: Props) {
  const clamped = Math.max(0, Math.min(value, max));

  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span
        className="inline-flex items-center gap-0.5"
        role="img"
        aria-label={`${clamped.toFixed(1)} din ${max}`}
      >
        {Array.from({ length: max }).map((_, i) => {
          const remaining = clamped - i;
          if (remaining >= 1) {
            return <Star key={i} size={size} className="fill-gold text-gold" />;
          }
          if (remaining >= 0.5) {
            return <StarHalf key={i} size={size} className="fill-gold text-gold" />;
          }
          return <Star key={i} size={size} className="text-ink-disabled" />;
        })}
      </span>
      {showValue ? (
        <span className="text-sm font-semibold text-ink">
          {clamped.toFixed(1)} <span className="text-ink-muted">/ {max}</span>
        </span>
      ) : null}
    </span>
  );
}
