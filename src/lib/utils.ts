import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function sanitizeRedirect(url: string | null | undefined, fallback: string = '/app'): string {
    if (!url) return fallback;
    try {
        const decoded = decodeURIComponent(url);
        // Only allow absolute paths starting with a single slash, rejecting protocol-relative (//) and mixed (/\) paths.
        if (decoded.startsWith('/') && !decoded.startsWith('//') && !decoded.startsWith('/\\')) {
            return decoded;
        }
        return fallback;
    } catch {
        return fallback;
    }
}
