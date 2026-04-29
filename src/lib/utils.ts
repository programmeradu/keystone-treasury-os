import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Validates and sanitizes a redirect URL to prevent open redirect vulnerabilities.
 * Ensures the URL is a relative path starting with a single '/' and not an absolute URL like '//'.
 */
export function sanitizeRedirect(url: string | null | undefined): string {
  if (!url) return '/app';
  // Ensure it's a relative path and not a protocol-relative absolute URL
  if (url.startsWith('/') && !url.startsWith('//') && !url.startsWith('/\\')) {
    return url;
  }
  return '/app';
}
