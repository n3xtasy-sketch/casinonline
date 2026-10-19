import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
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
