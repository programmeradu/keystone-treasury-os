import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function sanitizeRedirect(url: string | null | undefined, fallback: string = '/app'): string {
  if (!url) return fallback;
  // Ensure the URL is a relative path starting with a single '/'
  // and not a protocol-relative URL ('//') or an absolute URL ('http', etc.)
  // or a backslash-based path ('/\')
  if (url.startsWith('/') && !url.startsWith('//') && !url.startsWith('/\\')) {
    return url;
  }
  return fallback;
}
