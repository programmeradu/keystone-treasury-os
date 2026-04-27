import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Sanitizes a redirect URL to prevent Open Redirect vulnerabilities.
 * Ensures the URL is a relative path starting with '/' and not '//' or '/\'.
 */
export function sanitizeRedirect(url: string | null | undefined, fallback: string = '/app'): string {
  if (!url || typeof url !== 'string') return fallback;

  // Must start with exactly one slash, followed by a non-slash and non-backslash character
  // or be exactly '/'
  if (url === '/') return url;
  if (url.startsWith('/') && !url.startsWith('//') && !url.startsWith('/\\')) {
    return url;
  }

  return fallback;
}
