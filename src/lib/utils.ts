import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function sanitizeRedirect(url: string | null, fallbackUrl = '/app'): string {
  if (!url) return fallbackUrl;

  try {
    // Basic validation: ensure it starts with / and is not a protocol-relative URL (//) or an escaped variant (/\)
    if (url.startsWith('/') && !url.startsWith('//') && !url.startsWith('/\\')) {
      return url;
    }
  } catch {
    // Ignore any unexpected errors
  }

  return fallbackUrl;
}
