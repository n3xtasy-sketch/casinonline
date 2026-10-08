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
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <Header />

        <div className="grid flex-1 gap-6 px-4 py-6 md:px-5 xl:grid-cols-[minmax(0,1fr)_var(--rightbar-w)] xl:px-6">
          <main className="min-w-0">{children}</main>
          <RightSidebar className="hidden xl:block" />
        </div>

        <Footer />
      </div>
    </div>
  );
}
