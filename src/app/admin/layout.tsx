import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

// Admin is session-dependent → always render per request.
export const instant = false;

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
