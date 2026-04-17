/**
 * Canonical site URL for metadata, sitemaps, JSON-LD, and OG tags.
 * Override with NEXT_PUBLIC_APP_URL (or NEXT_PUBLIC_SITE_URL) in each environment.
 */
export const DEFAULT_SITE_URL = "https://dreyv.com";

export function getSiteUrl(): URL {
  const raw =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.VERCEL_URL;
  if (!raw) {
    return new URL(DEFAULT_SITE_URL);
  }
  const withProtocol = raw.startsWith("http") ? raw : `https://${raw}`;
  return new URL(withProtocol);
}

export function getSiteOrigin(): string {
  return getSiteUrl().origin;
}

/** Extra Organization.sameAs URLs (GitHub, X, LinkedIn, etc.) — comma- or newline-separated. */
export function getOrgSameAsFromEnv(): string[] {
  const raw = process.env.NEXT_PUBLIC_ORG_SAME_AS;
  if (!raw?.trim()) return [];
  return [...new Set(raw.split(/[\s,]+/).map((s) => s.trim()).filter(Boolean))];
}
