import type { MetadataRoute } from "next";
import { getSiteOrigin } from "@/lib/seo/site";

export default function robots(): MetadataRoute.Robots {
  const origin = getSiteOrigin();

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/app/",
          "/app",
          "/api/",
          "/auth",
          "/auth/",
          "/mobile/",
          "/github-cleanup",
          "/hello",
          "/working-swap",
        ],
      },
    ],
    sitemap: `${origin}/sitemap.xml`,
    host: new URL(origin).host,
  };
}
