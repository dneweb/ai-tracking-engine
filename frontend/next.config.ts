import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      worker_threads: false,
    };
    return config;
  },
  async rewrites() {
    return [
      {
        // All /backend-api/* calls are proxied to the Render backend's /api/* routes.
        // Backend registers ALL routers under /api prefix, so the mapping is:
        // /backend-api/conversations → https://render.com/api/conversations
        source: "/backend-api/:path*",
        destination: "https://ai-tracking-engine.onrender.com/api/:path*",
      },
    ];
  },
};

export default nextConfig;