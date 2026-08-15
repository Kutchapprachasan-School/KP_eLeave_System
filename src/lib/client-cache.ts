/**
 * Client-Side Caching Utility for eLeave System
 * Stores data in browser localStorage with TTL and stale-while-revalidate support.
 * Safe for Next.js App Router (SSR & Client components).
 */

const CACHE_PREFIX = "eleave_cache_";
const DEFAULT_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours default TTL

interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttlMs: number;
  userId?: string;
}

/**
 * Save item to localStorage with TTL
 */
export function setClientCache<T>(key: string, data: T, ttlMs: number = DEFAULT_TTL_MS, userId?: string): void {
  if (typeof window === "undefined") return;
  try {
    const item: CacheItem<T> = {
      data,
      timestamp: Date.now(),
      ttlMs,
      userId,
    };
    window.localStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(item));
  } catch (err) {
    console.warn("[ClientCache] Failed to save cache:", key, err);
  }
}

/**
 * Retrieve item from localStorage
 * Returns { data, isStale, timestamp } or null if not cached
 */
export function getClientCache<T>(key: string, userId?: string): { data: T; isStale: boolean; timestamp: number } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(`${CACHE_PREFIX}${key}`);
    if (!raw) return null;

    const item: CacheItem<T> = JSON.parse(raw);

    // If cache belongs to another user, ignore it for security
    if (userId && item.userId && item.userId !== userId) {
      removeClientCache(key);
      return null;
    }

    const age = Date.now() - item.timestamp;
    const isStale = age > item.ttlMs;

    return {
      data: item.data,
      isStale,
      timestamp: item.timestamp,
    };
  } catch (err) {
    console.warn("[ClientCache] Failed to read cache:", key, err);
    return null;
  }
}

/**
 * Remove specific cache key
 */
export function removeClientCache(key: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(`${CACHE_PREFIX}${key}`);
  } catch (err) {
    // Ignore error
  }
}

/**
 * Clear all eleave_cache_ keys (e.g. on Logout or Action Invalidation)
 */
export function clearAllClientCaches(): void {
  if (typeof window === "undefined") return;
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key && key.startsWith(CACHE_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((k) => window.localStorage.removeItem(k));
  } catch (err) {
    console.warn("[ClientCache] Failed to clear all caches:", err);
  }
}
