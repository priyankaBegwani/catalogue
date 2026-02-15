/**
 * Simple in-memory cache for frequently accessed data
 * For production, consider Redis or Memcached
 */

class Cache {
  constructor() {
    this.store = new Map();
    this.ttl = new Map(); // Time to live
  }

  /**
   * Set cache with optional TTL (in seconds)
   */
  set(key, value, ttlSeconds = 300) {
    this.store.set(key, value);
    
    if (ttlSeconds > 0) {
      const expiresAt = Date.now() + (ttlSeconds * 1000);
      this.ttl.set(key, expiresAt);
      
      // Auto-cleanup
      setTimeout(() => this.delete(key), ttlSeconds * 1000);
    }
  }

  /**
   * Get cached value
   */
  get(key) {
    // Check if expired
    if (this.ttl.has(key)) {
      const expiresAt = this.ttl.get(key);
      if (Date.now() > expiresAt) {
        this.delete(key);
        return null;
      }
    }
    
    return this.store.get(key) || null;
  }

  /**
   * Delete cache entry
   */
  delete(key) {
    this.store.delete(key);
    this.ttl.delete(key);
  }

  /**
   * Clear all cache
   */
  clear() {
    this.store.clear();
    this.ttl.clear();
  }

  /**
   * Get or set pattern - fetch from cache or execute function
   */
  async getOrSet(key, fetchFn, ttlSeconds = 300) {
    const cached = this.get(key);
    if (cached !== null) {
      return cached;
    }

    const value = await fetchFn();
    this.set(key, value, ttlSeconds);
    return value;
  }
}

// Singleton instance
export const cache = new Cache();

/**
 * Cache middleware for GET requests
 */
export const cacheMiddleware = (ttlSeconds = 60) => {
  return (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    const key = `cache:${req.originalUrl}`;
    const cached = cache.get(key);

    if (cached) {
      return res.json(cached);
    }

    // Override res.json to cache the response
    const originalJson = res.json.bind(res);
    res.json = (data) => {
      cache.set(key, data, ttlSeconds);
      return originalJson(data);
    };

    next();
  };
};
