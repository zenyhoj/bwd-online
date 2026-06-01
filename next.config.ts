import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
});

const nextConfig: NextConfig = {
  typedRoutes: false,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co"
      },
      {
        protocol: "https",
        hostname: "tile.openstreetmap.org"
      }
    ]
  },
  devIndicators: false,
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb'
    }
  }
};

export default withSerwist(nextConfig);
