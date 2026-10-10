import type { Metadata } from "next";
import { NotFoundView } from "@/components/layout/NotFoundView";

export const metadata: Metadata = {
  title: "Pagina nu a fost găsită",
  robots: { index: false, follow: true },
};

/** Global 404 (unmatched top-level / admin routes) — minimal root shell. */
export default function NotFound() {
  return <NotFoundView />;
}
