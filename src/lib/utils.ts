import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}


export function sanitizeRedirect(url: string | null | undefined): string {
  if (!url) return "/app";

  try {
    // Only allow absolute paths starting with a single slash,
    // explicitly disallowing protocol-relative URLs (//) and backslashes (\)
    if (url.startsWith("/") && !url.startsWith("//") && !url.startsWith("/\\")) {
      return url;
    }
  } catch (e) {
    // ignore
  }

  return "/app";
}
