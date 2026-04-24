import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function sanitizeRedirect(url: string | null | undefined, fallback: string = '/app'): string {
  if (!url || typeof url !== 'string') return fallback;

  // Must start with exactly one slash, not two (e.g. //example.com) or slash-backslash (/\example.com)
  if (url.startsWith('/') && !url.startsWith('//') && !url.startsWith('/\\')) {
    return url;
  }

  return fallback;
}
