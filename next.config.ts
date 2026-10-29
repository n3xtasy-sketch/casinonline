import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // SEO-A URL migration. Permanent (308) redirects for routes that actually moved.
  // Pacănele: the whole hub + detail tree moved /jocuri-casino → /pacanele-online.
  // Bonusuri: ONLY the hub moved (/bonusuri-casino → /bonusuri). The individual bonus
  // detail pages stay at /bonusuri-casino/[slug] until the SEO-C evergreen migration, so
  // they are deliberately NOT redirected (no redirect to a non-existent destination).
  async redirects() {
    return [
      { source: "/jocuri-casino", destination: "/pacanele-online", permanent: true },
      { source: "/jocuri-casino/:slug*", destination: "/pacanele-online/:slug*", permanent: true },
      { source: "/bonusuri-casino", destination: "/bonusuri", permanent: true },
    ];
  },
  experimental: {
    // Media uploads post a resized WebP blob through a Server Action.
    serverActions: { bodySizeLimit: "6mb" },
  },
  images: {
    // Allow next/image to optimize logos/thumbnails served from Supabase Storage.
    // Explicit hosts (prod + dev); restricted to the public Storage path.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "rmnltqmmemqfgvjglzqa.supabase.co", // Production
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "radhontyxrzjeatsaccg.supabase.co", // Dev
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
