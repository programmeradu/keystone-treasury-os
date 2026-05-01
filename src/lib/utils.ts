import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Sanitizes a redirect URL to ensure it is a relative path.
 * Prevents Open Redirect vulnerabilities by rejecting absolute URLs and protocol-relative URLs.
 */
export function sanitizeRedirect(url: string | null | undefined, defaultUrl = '/app'): string {
  if (!url || typeof url !== 'string') return defaultUrl;

  // Ensure the URL starts with a single slash, not a double slash or a backslash
  if (url.startsWith('/') && !url.startsWith('//') && !url.startsWith('/\\')) {
    return url;
  }

  return defaultUrl;
}
