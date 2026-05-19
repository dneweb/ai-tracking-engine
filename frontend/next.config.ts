import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      worker_threads: false,
    };
    return config;
  },
  turbopack: {},
  async rewrites() {
    const isDev = process.env.NODE_ENV === "development";
    const localBackend = "http://127.0.0.1:8000/api/:path*";
    const prodBackend = "https://ai-tracking-engine.onrender.com/api/:path*";

    return [
      {
        // All /backend-api/* calls are proxied to the backend's /api/* routes.
        // During development, it proxies to the local FastAPI backend (127.0.0.1:8000).
        // In production, it proxies to the live Render deployment.
        source: "/backend-api/:path*",
        destination: process.env.BACKEND_API_URL 
          ? `${process.env.BACKEND_API_URL.replace(/\/$/, "")}/api/:path*`
          : (isDev ? localBackend : prodBackend),
      },
    ];
  },
};

export default nextConfig;