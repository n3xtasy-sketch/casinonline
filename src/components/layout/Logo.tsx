import Link from "next/link";
import { Dice5 } from "lucide-react";

export function Logo() {
  return (
    <Link
      href="/"
      aria-label="CasinOnline.ro — acasă"
      className="flex items-center gap-2.5"
    >
      <span className="grid size-9 place-items-center rounded-sm bg-accent/15 text-accent">
        <Dice5 size={20} strokeWidth={2} />
      </span>
      <span className="text-[17px] font-bold tracking-tight text-ink">
        CasinOnline<span className="text-accent">.ro</span>
      </span>
    </Link>
  );
}
