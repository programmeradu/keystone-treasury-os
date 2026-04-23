import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Sanitizes a redirect URL to prevent Open Redirect vulnerabilities.
 * Ensures the path is a relative path starting with a single '/' and not '//' or '/\'.
 * Falls back to the default path if invalid.
 */
export function sanitizeRedirect(url: string | null | undefined, fallback: string = '/app'): string {
    if (!url) return fallback;

    // Must start with exactly one slash, not two (//) or slash-backslash (/\)
    if (url.startsWith('/') && !url.startsWith('//') && !url.startsWith('/\\')) {
        return url;
    }

    return fallback;
}
