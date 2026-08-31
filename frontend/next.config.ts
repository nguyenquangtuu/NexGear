import type { NextConfig } from "next";

const backendProxyTarget =
  process.env.BACKEND_PROXY_TARGET ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "http://127.0.0.1:5000";

const nextConfig: NextConfig = {
  output: "standalone",
  turbopack: {
    root: process.cwd(),
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${backendProxyTarget}/api/:path*`,
      },
      {
        source: '/uploads/:path*',
        destination: `${backendProxyTarget}/uploads/:path*`,
      },
    ];
  },
};

export default nextConfig;
