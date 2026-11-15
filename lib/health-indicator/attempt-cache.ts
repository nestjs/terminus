type CacheEntry<T> = {
  promise: Promise<T>;
  expiresAt: number;
  settled: boolean;
};

/**
 * Caches the outcome of health check attempts by indicator key.
 * Concurrent calls for the same key share a single in-flight run.
 *
 * @internal
 */
export class AttemptCache<T> {
  private readonly entries = new Map<string, CacheEntry<T>>();

  /**
   * Returns the cached value while it is fresh, otherwise runs `run` and caches it.
   * `cached` is `true` only if the value was already settled, not for callers
   * that joined an in-flight run.
   */
  async getOrRun(
    key: string,
    ttlMs: number,
    run: () => Promise<T>,
  ): Promise<{ value: T; cached: boolean }> {
    const existing = this.entries.get(key);
    if (existing && existing.expiresAt > Date.now()) {
      const cached = existing.settled;
      return { value: await existing.promise, cached };
    }

    const entry: CacheEntry<T> = {
      promise: run(),
      expiresAt: Date.now() + ttlMs,
      settled: false,
    };
    this.entries.set(key, entry);

    const value = await entry.promise;
    // The TTL starts once the run has finished.
    entry.expiresAt = Date.now() + ttlMs;
    entry.settled = true;

    return { value, cached: false };
  }
}
