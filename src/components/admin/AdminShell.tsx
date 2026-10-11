"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Dice5,
  Gift,
  Gamepad2,
  Boxes,
  CreditCard,
  BookOpen,
  Link2,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { logoutAction } from "@/app/admin/actions";

/** Nav items. `ready: true` are built; the rest are placeholders until CRUD (Phase 2+). */
const items = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard, ready: true },
  { label: "Cazinouri", href: "/admin/cazinouri", icon: Dice5, ready: true },
  { label: "Bonusuri", href: "/admin/bonusuri", icon: Gift, ready: true },
  { label: "Jocuri", href: "/admin/jocuri", icon: Gamepad2, ready: true },
  { label: "Furnizori", href: "/admin/furnizori", icon: Boxes, ready: true },
  { label: "Metode de plată", href: "/admin/metode-de-plata", icon: CreditCard },
  { label: "Ghiduri", href: "/admin/ghiduri", icon: BookOpen },
  { label: "Affiliate Links", href: "/admin/affiliate-links", icon: Link2 },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const rowBase = "flex h-10 items-center gap-2.5 rounded-sm px-3 text-sm font-medium";

  return (
    <div className="flex min-h-dvh bg-base">
      <aside
        aria-label="Administrare"
        className="sticky top-0 flex h-dvh w-60 shrink-0 flex-col border-r border-border bg-sidebar"
      >
        <div className="flex h-14 items-center px-4 text-sm font-bold text-ink">
          Admin · CasinOnline
        </div>

        <nav aria-label="Meniu admin" className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-2">
          {items.map((it) => {
            const Icon = it.icon;
            if (!it.ready) {
              return (
                <span
                  key={it.href}
                  aria-disabled="true"
                  title="Disponibil în curând"
                  className={cn(rowBase, "cursor-default text-ink-muted/70")}
                >
                  <Icon size={17} strokeWidth={1.9} />
                  {it.label}
                </span>
              );
            }
            const active = pathname === it.href;
            return (
              <Link
                key={it.href}
                href={it.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  rowBase,
                  active ? "bg-accent/12 text-ink" : "text-ink-secondary hover:bg-elevated hover:text-ink",
                )}
              >
                <Icon size={17} strokeWidth={1.9} />
                {it.label}
              </Link>
            );
          })}
        </nav>

        <form action={logoutAction} className="border-t border-border p-3">
          <button
            type="submit"
            className="flex h-10 w-full items-center gap-2.5 rounded-sm px-3 text-sm font-medium text-ink-secondary transition-colors hover:bg-elevated hover:text-ink"
          >
            <LogOut size={17} strokeWidth={1.9} />
            Delogare
          </button>
        </form>
      </aside>

      <main className="min-w-0 flex-1 p-6">{children}</main>
    </div>
  );
}
