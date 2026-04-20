import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}


export function sanitizeRedirect(url: string | null, fallback: string = '/app'): string {
  if (!url) return fallback;
  // Ensure the URL is a relative path starting with /
  // Reject protocol-relative URLs (//) and path traversal attempts (/\)
  if (url.startsWith('/') && !url.startsWith('//') && !url.startsWith('/\\')) {
    return url;
  }
  return fallback;
}
