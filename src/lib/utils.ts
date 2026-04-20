import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}


/**
 * Validates and sanitizes a redirect URL to prevent Open Redirect vulnerabilities.
 * Ensures the URL is a relative path starting with '/' and not '//' or '/\'.
 * If invalid, returns the default fallback.
 */
export function sanitizeRedirect(url: string | null | undefined, fallback: string = '/app'): string {
    if (!url) return fallback;

    // Check if it's a valid relative URL
    // Must start with exactly one slash, not followed by another slash or backslash
    if (url.startsWith('/') && !url.startsWith('//') && !url.startsWith('/\\')) {
        return url;
    }

    return fallback;
}
