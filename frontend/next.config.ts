import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      worker_threads: false,
    };
    return config;
  },
};

export default nextConfig;