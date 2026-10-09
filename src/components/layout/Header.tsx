import { Heart } from "lucide-react";
import { MobileNav } from "./MobileNav";
import { SearchInput } from "@/components/ui/SearchInput";
import { IconButton } from "@/components/ui/IconButton";

/** Sticky global header: mobile menu, search, favorites, auth actions. */
export function Header() {
  return (
    <header
      className="sticky top-0 z-40 flex h-[var(--header-h)] items-center gap-3 border-b border-border px-4 backdrop-blur-xl md:px-5 xl:px-6"
      style={{ backgroundColor: "var(--header-bg)" }}
    >
      <MobileNav />

      <SearchInput className="w-full max-w-[480px]" />

      <div className="ml-auto flex items-center gap-2">
        <IconButton label="Favorite">
          <Heart size={19} strokeWidth={1.9} />
        </IconButton>
      </div>
    </header>
  );
}
