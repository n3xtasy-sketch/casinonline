import type { Metadata } from "next";
import { NotFoundView } from "@/components/layout/NotFoundView";

export const metadata: Metadata = {
  title: "Pagina nu a fost găsită",
  robots: { index: false, follow: true },
};

/** 404 for public routes — renders inside the (site) AppShell. */
export default function NotFound() {
  return <NotFoundView />;
}
