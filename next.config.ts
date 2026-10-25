import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Build-directory override for non-destructive validation builds while the dev
  // server is running (platform builds never set this and keep using .next).
  ...(process.env.NEXT_DIST_DIR ? { distDir: process.env.NEXT_DIST_DIR } : {}),
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Hero/gallery images may be pasted as external https URLs by admins (no-code editor).
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
};

export default nextConfig;
