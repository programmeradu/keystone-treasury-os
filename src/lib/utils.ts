import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateId(prefix: string = "id"): string {
    return `${prefix}_${globalThis.crypto.randomUUID().replace(/-/g, '').substring(0, 16)}`;
}
