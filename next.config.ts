import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  serverExternalPackages: ["web-push"],
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
