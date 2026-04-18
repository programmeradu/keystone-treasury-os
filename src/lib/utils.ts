import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function sanitizeRedirect(url: string | null | undefined, fallback: string = '/app'): string {
    if (!url) return fallback;

    // Decode the URL in case it's double-encoded
    try {
        url = decodeURIComponent(url);
    } catch {
        return fallback;
    }

    // Must be a relative path starting with a single slash (but not //)
    if (url.startsWith('/') && !url.startsWith('//')) {
        return url;
    }

    return fallback;
}
