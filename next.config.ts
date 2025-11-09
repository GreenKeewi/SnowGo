import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  experimental: {
    // Disable static optimization for pages that use Clerk
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
};

export default nextConfig;
