import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  async redirects() {
    // Handle the entry route before rendering or instant-navigation validation.
    return [{ source: "/", destination: "/login", permanent: false }];
  },
  async rewrites() {
    const backend = process.env.BACKEND_URL ?? "http://localhost:8080";
    return [{ source: "/api/:path*", destination: `${backend}/api/:path*` }];
  },
  experimental: {
    agentFeedback: true,
    // Avoid socket-based loader workers in restricted local build environments.
    turbopackPluginRuntimeStrategy: process.env.NEXT_FORCE_WORKER_THREADS === "1" ? "forceWorkerThreads" : "workerThreads",
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    root: __dirname,
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
