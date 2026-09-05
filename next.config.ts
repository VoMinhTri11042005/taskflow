import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Vercel packages Next.js applications itself. Its build adapter conflicts
  // with standalone tracing in Next 16, while Docker still needs standalone.
  output: process.env.VERCEL ? undefined : "standalone",
  reactStrictMode: true,
};

export default nextConfig;
