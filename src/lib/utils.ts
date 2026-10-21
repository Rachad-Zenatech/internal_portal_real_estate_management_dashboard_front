import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatExactFileSize(bytes?: number | null): string {
  if (bytes === undefined || bytes === null || isNaN(bytes)) return '0 bytes';
  if (bytes <= 0) return '0 bytes';

  let formattedReadable = '';
  if (bytes < 1024) {
    formattedReadable = `${bytes} B`;
  } else if (bytes < 1024 * 1024) {
    formattedReadable = `${(bytes / 1024).toFixed(1)} KB`;
  } else if (bytes < 1024 * 1024 * 1024) {
    formattedReadable = `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  } else {
    formattedReadable = `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }

  return `${Number(bytes).toLocaleString()} bytes (${formattedReadable})`;
}
