import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Vercel handles Next.js output automatically. */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
