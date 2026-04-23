import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function sanitizeRedirect(url: string | null | undefined, fallback: string = '/app'): string {
    if (!url) return fallback;

    // Ensure it's a relative path starting with /
    // Block protocol-relative URLs (//) and backslash tricks (/\)
    if (url.startsWith('/') && !url.startsWith('//') && !url.startsWith('/\\')) {
        return url;
    }

    return fallback;
}
