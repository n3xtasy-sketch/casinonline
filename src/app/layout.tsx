import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { siteConfig } from "@/lib/site";

// latin-ext aduce glifele românești (ă/ș/ț etc.); latin acoperă â/î.
// Ambele fonturi expun latin-ext (verificat în next/font font-data.json).
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "latin-ext"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin", "latin-ext"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: "CasinOnline.ro — Cazinouri online, bonusuri și jocuri",
    template: "%s · CasinOnline.ro",
  },
  description: siteConfig.description,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: siteConfig.name,
    locale: siteConfig.locale,
    url: siteConfig.url,
    title: "CasinOnline.ro — Cazinouri online, bonusuri și jocuri",
    description: siteConfig.description,
  },
  twitter: {
    card: "summary_large_image",
    title: "CasinOnline.ro — Cazinouri online, bonusuri și jocuri",
    description: siteConfig.description,
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="ro"
      data-scroll-behavior="smooth"
      className={`${geistSans.variable} ${geistMono.variable}`}
    >
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
