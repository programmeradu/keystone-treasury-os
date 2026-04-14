/**
 * Canonical site URL for metadata, sitemaps, JSON-LD, and OG tags.
 * Set NEXT_PUBLIC_APP_URL in production (e.g. https://dreyv.stauniverse.tech).
 */
export const DEFAULT_SITE_URL = "https://dreyv.stauniverse.tech";

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
