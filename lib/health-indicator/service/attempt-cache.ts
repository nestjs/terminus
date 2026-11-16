import { type AdditionalData } from './attempt-data.js';
import { type HealthIndicatorStatus } from './health-indicator-result.interface.js';

/**
 * What one run of an attempt function gave, before the settings of the
 * attempt (static data, `degraded`) are applied.
 *
 * @internal
 */
export type AttemptOutcome = {
  status: HealthIndicatorStatus.UP | HealthIndicatorStatus.DOWN;
  data: AdditionalData;
  responseTime: number;
};

type CacheEntry = {
  promise: Promise<AttemptOutcome>;
  expiresAt: number;
  settled: boolean;
};

/**
 * Caches the outcome of health check attempts by indicator key.
 * Concurrent calls for the same key share a single in-flight run.
 *
 * @internal
 */
export class AttemptCache {
  private readonly entries = new Map<string, CacheEntry>();

  /**
   * Returns the cached value while it is fresh, otherwise runs `run` and caches it.
   * `cached` is `true` only if the value was already settled, not for callers
   * that joined an in-flight run.
   */
  async getOrRun(
    key: string,
    ttlMs: number,
    run: () => Promise<AttemptOutcome>,
  ): Promise<{ value: AttemptOutcome; cached: boolean }> {
    const existing = this.entries.get(key);
    if (existing && existing.expiresAt > Date.now()) {
      const cached = existing.settled;
      return { value: await existing.promise, cached };
    }

    const entry: CacheEntry = {
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
