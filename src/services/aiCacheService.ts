/**
 * AI Response Cache Service
 * Powered by IndexedDB with localStorage fallback
 * Provides instant (< 10ms) responses for repeated or similar AI generation requests
 */

export interface CacheEntry<T = any> {
  id: string;
  key: string;
  module: 'exam' | 'worksheet' | 'matrix' | 'lesson' | 'general';
  payload: T;
  createdAt: number;
  ttlMs: number;
  hits: number;
  summaryText?: string;
}

const DB_NAME = 'eduplan_ai_cache_db';
const DB_VERSION = 1;
const STORE_NAME = 'ai_responses';
const DEFAULT_TTL_HOURS = 48; // 48 hours default cache life

// Simple hash function for client-side deterministic key generation
export function generateHashKey(module: string, params: Record<string, any> | string): string {
  const str = typeof params === 'string' ? params : JSON.stringify(params, Object.keys(params).sort());
  let hash1 = 5381;
  let hash2 = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash1 = (hash1 * 33) ^ char;
    hash2 = (hash2 * 17) ^ char;
  }
  const u1 = (hash1 >>> 0).toString(16);
  const u2 = (hash2 >>> 0).toString(16);
  return `${module}_${u1}_${u2}`;
}

class AICacheService {
  private dbPromise: Promise<IDBDatabase | null> | null = null;

  constructor() {
    this.initDB();
  }

  private initDB(): Promise<IDBDatabase | null> {
    if (this.dbPromise) return this.dbPromise;

    if (typeof window === 'undefined' || !window.indexedDB) {
      console.warn('[AICacheService] IndexedDB not available, falling back to localStorage');
      this.dbPromise = Promise.resolve(null);
      return this.dbPromise;
    }

    this.dbPromise = new Promise((resolve) => {
      try {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            const store = db.createObjectStore(STORE_NAME, { keyPath: 'key' });
            store.createIndex('module', 'module', { unique: false });
            store.createIndex('createdAt', 'createdAt', { unique: false });
          }
        };

        request.onsuccess = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          resolve(db);
        };

        request.onerror = (err) => {
          console.warn('[AICacheService] IndexedDB open error:', err);
          resolve(null);
        };
      } catch (e) {
        console.warn('[AICacheService] IndexedDB init exception:', e);
        resolve(null);
      }
    });

    return this.dbPromise;
  }

  /**
   * Retrieves a cached response if valid and not expired
   */
  async get<T = any>(key: string): Promise<{ data: T; isCached: boolean; cachedAt: number; hits: number } | null> {
    try {
      const db = await this.initDB();
      let entry: CacheEntry<T> | null = null;

      if (db) {
        entry = await new Promise<CacheEntry<T> | null>((resolve) => {
          try {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const req = store.get(key);
            req.onsuccess = () => resolve(req.result || null);
            req.onerror = () => resolve(null);
          } catch {
            resolve(null);
          }
        });
      } else {
        // Fallback to localStorage
        const raw = localStorage.getItem(`eduplan_cache_${key}`);
        if (raw) {
          try {
            entry = JSON.parse(raw);
          } catch {
            entry = null;
          }
        }
      }

      if (!entry) return null;

      // Check TTL expiration
      const now = Date.now();
      if (entry.createdAt + entry.ttlMs < now) {
        // Expired -> delete asynchronously
        this.delete(key);
        return null;
      }

      // Increment hit count asynchronously
      entry.hits = (entry.hits || 0) + 1;
      this.updateHitCount(key, entry.hits);

      return {
        data: entry.payload,
        isCached: true,
        cachedAt: entry.createdAt,
        hits: entry.hits
      };
    } catch (err) {
      console.warn('[AICacheService] Error getting cache item:', err);
      return null;
    }
  }

  /**
   * Stores an AI response in cache
   */
  async set<T = any>(
    key: string,
    module: CacheEntry['module'],
    payload: T,
    summaryText?: string,
    ttlHours: number = DEFAULT_TTL_HOURS
  ): Promise<void> {
    try {
      const db = await this.initDB();
      const entry: CacheEntry<T> = {
        id: Math.random().toString(36).substring(2),
        key,
        module,
        payload,
        createdAt: Date.now(),
        ttlMs: ttlHours * 60 * 60 * 1000,
        hits: 0,
        summaryText
      };

      if (db) {
        await new Promise<void>((resolve) => {
          try {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const req = store.put(entry);
            req.onsuccess = () => resolve();
            req.onerror = () => resolve();
          } catch {
            resolve();
          }
        });
      } else {
        try {
          localStorage.setItem(`eduplan_cache_${key}`, JSON.stringify(entry));
        } catch (e) {
          console.warn('[AICacheService] localStorage quota exceeded while caching');
        }
      }
    } catch (err) {
      console.warn('[AICacheService] Error setting cache item:', err);
    }
  }

  /**
   * Updates hit count for an item
   */
  private async updateHitCount(key: string, hits: number): Promise<void> {
    try {
      const db = await this.initDB();
      if (db) {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(key);
        req.onsuccess = () => {
          if (req.result) {
            req.result.hits = hits;
            store.put(req.result);
          }
        };
      }
    } catch (e) {
      // Ignore
    }
  }

  /**
   * Deletes a specific cache item
   */
  async delete(key: string): Promise<void> {
    try {
      const db = await this.initDB();
      if (db) {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.delete(key);
      } else {
        localStorage.removeItem(`eduplan_cache_${key}`);
      }
    } catch (err) {
      console.warn('[AICacheService] Error deleting cache item:', err);
    }
  }

  /**
   * Clears all cache entries or entries for a specific module
   */
  async clear(module?: string): Promise<number> {
    let deletedCount = 0;
    try {
      const db = await this.initDB();
      if (db) {
        await new Promise<void>((resolve) => {
          const tx = db.transaction(STORE_NAME, 'readwrite');
          const store = tx.objectStore(STORE_NAME);
          if (!module) {
            const req = store.clear();
            req.onsuccess = () => resolve();
            req.onerror = () => resolve();
          } else {
            const index = store.index('module');
            const req = index.openCursor(IDBKeyRange.only(module));
            req.onsuccess = (e) => {
              const cursor = (e.target as IDBRequest).result;
              if (cursor) {
                cursor.delete();
                deletedCount++;
                cursor.continue();
              } else {
                resolve();
              }
            };
            req.onerror = () => resolve();
          }
        });
      } else {
        // Fallback localStorage clean
        Object.keys(localStorage).forEach((k) => {
          if (k.startsWith('eduplan_cache_')) {
            if (!module || k.includes(`_${module}_`)) {
              localStorage.removeItem(k);
              deletedCount++;
            }
          }
        });
      }
    } catch (err) {
      console.warn('[AICacheService] Error clearing cache:', err);
    }
    return deletedCount;
  }

  /**
   * Retrieves overall stats about cached entries
   */
  async getStats(): Promise<{ count: number; totalSizeBytes: number; modules: Record<string, number> }> {
    let count = 0;
    let totalSizeBytes = 0;
    const modules: Record<string, number> = {};

    try {
      const db = await this.initDB();
      if (db) {
        await new Promise<void>((resolve) => {
          const tx = db.transaction(STORE_NAME, 'readonly');
          const store = tx.objectStore(STORE_NAME);
          const req = store.openCursor();
          req.onsuccess = (e) => {
            const cursor = (e.target as IDBRequest).result;
            if (cursor) {
              const val: CacheEntry = cursor.value;
              count++;
              const size = JSON.stringify(val).length * 2; // rough byte estimate
              totalSizeBytes += size;
              modules[val.module] = (modules[val.module] || 0) + 1;
              cursor.continue();
            } else {
              resolve();
            }
          };
          req.onerror = () => resolve();
        });
      } else {
        Object.keys(localStorage).forEach((k) => {
          if (k.startsWith('eduplan_cache_')) {
            count++;
            const item = localStorage.getItem(k) || '';
            totalSizeBytes += item.length * 2;
          }
        });
      }
    } catch (e) {
      console.warn('[AICacheService] Error getting stats:', e);
    }

    return { count, totalSizeBytes, modules };
  }
}

export const aiCacheService = new AICacheService();
