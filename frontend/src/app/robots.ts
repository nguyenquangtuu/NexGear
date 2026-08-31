import type { MetadataRoute } from "next";

const FRONTEND_URL = (process.env.NEXT_PUBLIC_FRONTEND_URL || "https://nexgear.vn").replace(/\/+$/, "");

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/login",
        "/register",
        "/forgot-password",
        "/reset-password",
        "/wishlist",
        "/profile",
        "/notifications",
        "/chat",
        "/tp-admin",
      ],
    },
    sitemap: `${FRONTEND_URL}/sitemap.xml`,
  };
}
