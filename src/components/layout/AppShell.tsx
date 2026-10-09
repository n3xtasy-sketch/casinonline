import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { RightSidebar } from "./RightSidebar";
import { Footer } from "./Footer";

/**
 * Global application shell (DESIGN.md):
 *   Left Sidebar · Main Content · Right Sidebar
 * Centered within a max shell width; responsive down to a single column.
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-[var(--shell-max)]">
      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-sm focus:bg-accent focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-[#06110a]"
      >
        Sari la conținut
      </a>
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <Header />

        <div className="grid flex-1 gap-6 px-4 py-6 md:px-5 xl:grid-cols-[minmax(0,1fr)_var(--rightbar-w)] xl:px-6">
          <main id="content" className="min-w-0">{children}</main>
          <RightSidebar className="hidden xl:block" />
        </div>

        <Footer />
      </div>
    </div>
  );
}
