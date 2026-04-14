import type { MetadataRoute } from "next";
import { getSiteOrigin } from "@/lib/seo/site";

/**
 * Public, indexable routes (aligned with robots.ts + middleware noindex rules).
 * Omit authenticated app surfaces, APIs, and dev/test pages.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = getSiteOrigin();
  const lastModified = new Date();

  const paths: Array<{
    path: string;
    changeFrequency: MetadataRoute.Sitemap[0]["changeFrequency"];
    priority: number;
  }> = [
    { path: "/", changeFrequency: "weekly", priority: 1 },
    { path: "/pricing", changeFrequency: "monthly", priority: 0.9 },
    { path: "/atlas", changeFrequency: "weekly", priority: 0.85 },
    {
      path: "/guides/command-ops-for-web3-treasuries",
      changeFrequency: "monthly",
      priority: 0.75,
    },
    { path: "/legal/privacy", changeFrequency: "yearly", priority: 0.4 },
    { path: "/legal/terms", changeFrequency: "yearly", priority: 0.4 },
    { path: "/legal/cookies", changeFrequency: "yearly", priority: 0.3 },
    { path: "/legal/refunds", changeFrequency: "yearly", priority: 0.3 },
  ];

  return paths.map(({ path, changeFrequency, priority }) => ({
    url: `${base}${path}`,
    lastModified,
    changeFrequency,
    priority,
  }));
}
