import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["tasks.iananas.eu"],
  experimental: {
    serverActions: {
      bodySizeLimit: "40mb"
    }
  }
};

export default nextConfig;
