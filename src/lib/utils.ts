import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function sanitizeRedirect(url: string | null): string {
    if (!url) return '/app';
    if (url.startsWith('//') || url.startsWith('/\\')) return '/app';
    if (url.startsWith('/')) return url;
    return '/app';
}
