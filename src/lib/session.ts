import type { QueryClient } from '@tanstack/react-query';
import { clearQueuedWrites } from './offline-write-queue';

// Service-worker caches that may hold authenticated responses or rendered
// pages belonging to the signed-in user.
const SENSITIVE_CACHE_PREFIXES = ['apis', 'pages', 'pages-rsc', 'next-data'];

/** Removes every trace of the signed-in user from this device. Used by sign-out
 * and by account deletion, which must not leave cached data behind. */
export async function clearClientSession(queryClient: QueryClient) {
  clearQueuedWrites();

  try {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('authToken');
      localStorage.removeItem('refreshToken');
    }
  } catch {
    // storage unavailable — nothing was persisted to clear
  }

  queryClient.clear();

  if (typeof window !== 'undefined' && 'caches' in window) {
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames
        .filter(name =>
          SENSITIVE_CACHE_PREFIXES.some(prefix => name.startsWith(prefix))
        )
        .map(name => caches.delete(name))
    );
  }
}
