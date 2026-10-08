import Image from "next/image";
import { cn } from "@/lib/cn";

interface Props {
  name: string;
  /** Logo image path; when absent, initials are shown. */
  src?: string;
  className?: string;
}

function initialsOf(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

/** Neutral logo container (DESIGN.md "Casino card logo area"). Reused by casino/provider. */
export function LogoWell({ name, src, className }: Props) {
  return (
    <div className={cn("grid shrink-0 place-items-center rounded-sm bg-logo p-4", className)}>
      {src ? (
        <Image
          src={src}
          alt={name}
          width={96}
          height={48}
          className="h-auto max-h-full w-auto max-w-full object-contain"
        />
      ) : (
        <span className="text-sm font-bold tracking-wide text-ink-secondary">
          {initialsOf(name)}
        </span>
      )}
    </div>
  );
}
