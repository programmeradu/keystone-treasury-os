import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function sanitizeRedirect(url: string | null | undefined, fallback: string = '/app'): string {
  if (!url || typeof url !== 'string') return fallback;
  // Validates if it is a relative URL starting with / and not // or /\ to prevent open redirect
  if (url.startsWith('/') && !url.startsWith('//') && !url.startsWith('/\\')) {
    return url;
  }
  return fallback;
}
