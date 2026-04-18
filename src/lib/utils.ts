import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}


/**
 * Sanitizes a redirect URL to prevent Open Redirect vulnerabilities.
 * Ensures the URL is a relative path starting with '/' but not '//'.
 * @param url The raw redirect URL.
 * @param fallback The fallback URL if invalid.
 */
export function sanitizeRedirect(url: string | null | undefined, fallback = '/app'): string {
    if (!url || typeof url !== 'string') return fallback;
    // Must start with '/' and not '//' to prevent protocol-relative URLs (e.g., //evil.com)
    if (url.startsWith('/') && !url.startsWith('//') && !url.startsWith('/\\')) {
        return url;
    }
    return fallback;
}
