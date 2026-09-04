import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "192.168.0.2",
    "192.168.0.2:3000",
    "localhost",
    "localhost:3000",
    "*.trycloudflare.com",
    "trycloudflare.com",
  ],

  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;