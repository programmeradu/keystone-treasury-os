import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function sanitizeRedirect(url: string | null | undefined): string {
    if (!url || typeof url !== 'string') {
        return '/app';
    }

    // Prevent open redirect by ensuring URL is a relative path starting with /
    // but not // or /\
    if (url.startsWith('/') && !url.startsWith('//') && !url.startsWith('/\\')) {
        return url;
    }

    return '/app';
}
