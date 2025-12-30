import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  turbopack: {},
  serverExternalPackages: ["pino-pretty", "lokijs", "encoding"],
};

export default nextConfig;
