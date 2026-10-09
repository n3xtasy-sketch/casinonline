import { Logo } from "./Logo";
import { SidebarNav } from "./SidebarNav";

/** Persistent left sidebar — desktop only (>= lg). Mobile uses MobileNav. */
export function Sidebar() {
  return (
    <aside
      aria-label="Meniu lateral"
      className="sticky top-0 hidden h-dvh w-[var(--sidebar-w)] shrink-0 flex-col border-r border-border bg-sidebar lg:flex"
    >
      <div className="flex h-[var(--header-h)] items-center px-4">
        <Logo />
      </div>
      <div className="flex-1 overflow-y-auto px-3 pb-6">
        <SidebarNav />
      </div>
    </aside>
  );
}
