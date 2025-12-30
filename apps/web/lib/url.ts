/**
 * Get the application's base URL
 *
 * In production, uses NEXT_PUBLIC_APP_URL environment variable
 * In development, falls back to window.location.origin
 *
 * @returns The base URL without trailing slash
 */
export function getAppUrl(): string {
  // Use configured URL if available (production)
  if (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, ''); // Remove trailing slash
  }

  // Fall back to current origin (development)
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }

  // Default fallback (server-side rendering)
  return '';
}

/**
 * Hook to get app URL with client-side hydration safety
 * Returns empty string on server, actual URL after hydration
 */
export function useAppUrl(): string {
  // If env variable is set, use it (safe for SSR)
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '');
  }

  // Otherwise, must use client-side window.location
  // Return empty string on server to avoid hydration mismatch
  if (typeof window === 'undefined') {
    return '';
  }

  return window.location.origin;
}
