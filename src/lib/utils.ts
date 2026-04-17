import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Sanitizes a redirect URL to prevent Open Redirect vulnerabilities.
 * Ensures the URL is a relative path starting with '/' and not '//'.
 */
export function sanitizeRedirect(url: string | null | undefined, fallback: string = '/app'): string {
    if (!url || typeof url !== 'string') return fallback;

    // Only allow relative paths starting with a single slash
    if (url.startsWith('/') && !url.startsWith('//') && !url.startsWith('/\\')) {
        return url;
    }

    return fallback;
}
