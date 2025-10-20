import { clsx, type ClassValue } from "clsx"

export function cn(...inputs: ClassValue[]) {
  // Fallback to clsx-only to avoid runtime issues with tailwind-merge chunks
  return clsx(inputs)
}
