import { Injectable } from '@nestjs/common';
import {
  type HealthIndicatorResult,
  type HealthIndicatorStatus,
} from './health-indicator-result.interface.js';
import { isError } from '../utils/is-error.js';
import { rejectOnAbort } from '../utils/rejectOnAbort.js';

/**
 * Helper service which can be used to create health indicator results
 * @publicApi
 */
@Injectable()
export class HealthIndicatorService {
  private readonly cache = new Map<string, CacheEntry>();

  check<const Key extends string>(key: Key) {
    return new HealthIndicatorSession(key, this.cache);
  }
}

/**
 * Show a compilation error if `status` is used in the additional data.
 */
type WithoutStatus<T> = {
  [K in keyof T]: K extends 'status' ? never : T[K];
};

type AdditionalData = Record<string, unknown>;

type AttemptOutcome = {
  status: HealthIndicatorStatus;
  data: AdditionalData;
  responseTime: number;
};

type CacheEntry = {
  promise: Promise<AttemptOutcome>;
  expiresAt: number;
};

function assertNotReserved(data: AdditionalData, keys: readonly string[]) {
  for (const key of keys) {
    if (key in data) {
      throw new Error(
        `"${key}" is a reserved key and cannot be used in additional data`,
      );
    }
  }
}

/**
 * Indicate the health of a health indicator with the given key
 *
 * @publicApi
 */
export class HealthIndicatorSession<Key extends Readonly<string> = string> {
  constructor(
    private readonly key: Key,
    private readonly cache: Map<string, CacheEntry> = new Map(),
  ) {}

  private compose<S extends HealthIndicatorStatus>(
    status: S,
    data?: AdditionalData | string,
  ): HealthIndicatorResult<Key, S> {
    let additionalData: AdditionalData = {};

    if (typeof data === 'string') {
      additionalData = { message: data };
    } else if (typeof data === 'object' && data !== null) {
      additionalData = data;
    }

    assertNotReserved(additionalData, ['status']);

    const detail = { ...additionalData, status };

    return {
      [this.key]: detail,
      // TypeScript does not infer this.key as Key correctly.
    } as Record<Key, typeof detail>;
  }

  /**
   * Mark the health indicator as `down`
   * @param data additional data which will get appended to the result object
   * @remarks The `status` key is reserved and cannot be used in additional data.
   */
  down<T extends AdditionalData>(
    data?: T & WithoutStatus<T>,
  ): HealthIndicatorResult<Key, 'down', T>;
  down<T extends string>(
    data?: T,
  ): HealthIndicatorResult<Key, 'down', { message: T }>;
  down(data?: AdditionalData | string): HealthIndicatorResult<Key, 'down'> {
    return this.compose('down', data);
  }

  /**
   * Mark the health indicator as `degraded`: still serving, but impaired.
   * A degraded indicator does not fail the health check; the overall status
   * becomes `degraded` and the HTTP status stays 200.
   * @param data additional data which will get appended to the result object
   * @remarks The `status` key is reserved and cannot be used in additional data.
   */
  degraded<T extends AdditionalData>(
    data?: T & WithoutStatus<T>,
  ): HealthIndicatorResult<Key, 'degraded', T>;
  degraded<T extends string>(
    data?: T,
  ): HealthIndicatorResult<Key, 'degraded', { message: T }>;
  degraded(
    data?: AdditionalData | string,
  ): HealthIndicatorResult<Key, 'degraded'> {
    return this.compose('degraded', data);
  }

  /**
   * Mark the health indicator as `up`
   * @param data additional data which will get appended to the result object
   * @remarks The `status` key is reserved and cannot be used in additional data.
   */
  up<T extends AdditionalData>(
    data?: T & WithoutStatus<T>,
  ): HealthIndicatorResult<Key, 'up', T>;
  up<T extends string>(
    data?: T,
  ): HealthIndicatorResult<Key, 'up', { message: T }>;
  up(data?: AdditionalData | string): HealthIndicatorResult<Key, 'up'> {
    return this.compose('up', data);
  }

  /**
   * Attempt to execute a function and mark the health indicator as `up` or `down` based on whether it throws.
   * Returns a `HealthCheckAttempt` builder that can be further configured (e.g. `.withTimeout()`).
   *
   * @param fn The function to execute
   * @returns A `HealthCheckAttempt` builder
   * @remarks The `status`, `responseTime` and `cachedResponse` keys are reserved and cannot be used in the returned data.
   *
   * @example
   * ```typescript
   * this.healthIndicatorService
   *   .check('db')
   *   .attempt(async () => sql`SELECT(1)`)
   *
   * this.healthIndicatorService
   *   .check('external')
   *   .attempt(async ({ signal }) => { await fetch('https://example.com', { signal }) })
   *   .withTimeout(3000)
   * ```
   */
  attempt(
    fn: (options: {
      signal: AbortSignal;
    }) => Promise<AdditionalData | void> | AdditionalData | void,
  ): HealthCheckAttempt<Key> {
    return new HealthCheckAttempt(this, fn, this.key, this.cache);
  }
}

/**
 * A builder that describes a health check attempt.
 * Use `.withTimeout()` to configure a timeout.
 *
 * @publicApi
 */
export class HealthCheckAttempt<Key extends Readonly<string> = string>
  implements PromiseLike<HealthIndicatorResult<Key>>
{
  private timeoutMs?: number;
  private cacheTtlMs?: number;

  constructor(
    private readonly session: HealthIndicatorSession<Key>,
    private readonly fn: (options: {
      signal: AbortSignal;
    }) => Promise<AdditionalData | void> | AdditionalData | void,
    private readonly cacheKey: string = '',
    private readonly cacheStore: Map<string, CacheEntry> = new Map(),
  ) {}

  private toResult(
    outcome: AttemptOutcome,
    cachedResponse = false,
  ): HealthIndicatorResult<Key> {
    assertNotReserved(outcome.data, ['responseTime', 'cachedResponse']);

    const data = {
      ...outcome.data,
      responseTime: outcome.responseTime,
      ...(cachedResponse && { cachedResponse: true }),
    };

    return outcome.status === 'up'
      ? this.session.up(data)
      : this.session.down(data);
  }

  private async execute(): Promise<HealthIndicatorResult<Key>> {
    const ttl = this.cacheTtlMs;
    if (ttl === undefined) {
      return this.toResult(await this.run());
    }

    const cached = this.cacheStore.get(this.cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      // An in-flight entry (expiresAt: Infinity) is a shared fresh run, not a cache hit.
      const isCacheHit = Number.isFinite(cached.expiresAt);
      return this.toResult(await cached.promise, isCacheHit);
    }

    const entry: CacheEntry = { promise: this.run(), expiresAt: Infinity };
    this.cacheStore.set(this.cacheKey, entry);

    try {
      await entry.promise;
      entry.expiresAt = Date.now() + ttl;
    } catch {
      this.cacheStore.delete(this.cacheKey);
    }

    return this.toResult(await entry.promise);
  }

  private async run(): Promise<AttemptOutcome> {
    const start = performance.now();
    const controller = new AbortController();
    const signals = [controller.signal];
    let timeout: AbortSignal | undefined;

    if (this.timeoutMs !== undefined) {
      timeout = AbortSignal.timeout(this.timeoutMs);
      signals.push(timeout);
    }
    const signal = AbortSignal.any(signals);

    try {
      const promise = Promise.resolve(this.fn({ signal }));
      const result = await rejectOnAbort(promise, signal);

      return {
        status: 'up',
        data: toAdditionalData(result),
        responseTime: Math.round(performance.now() - start),
      };
    } catch (err) {
      const message = timeout?.aborted
        ? `timeout of ${this.timeoutMs}ms exceeded`
        : errorMessage(err);

      return {
        status: 'down',
        data: { message },
        responseTime: Math.round(performance.now() - start),
      };
    } finally {
      controller.abort();
    }
  }

  /**
   * Set a timeout for the health check attempt.
   * If the function does not resolve within the given time, the health indicator will be marked as `down`.
   * An `AbortSignal` is passed to the callback so the underlying operation can be cancelled.
   *
   * @param ms The timeout in milliseconds
   * @returns this (for chaining)
   */
  withTimeout(ms: number): this {
    if (ms < 0 || ms > 2 ** 32 - 1) {
      throw new Error(
        `Timeout must be between 0 and ${2 ** 32 - 1} milliseconds`,
      );
    }

    this.timeoutMs = ms;

    return this;
  }

  /**
   * Cache the result of this attempt for the given time.
   *
   * The cache is shared across requests and keyed by the indicator key:
   * while a fresh result exists, executing the attempt returns it without
   * running the function again, and concurrent executions share a single
   * in-flight run. Results served from the cache are marked with
   * `cachedResponse: true`.
   *
   * @param ttlMs Time to live in milliseconds
   * @returns this (for chaining)
   */
  cacheFor(ttlMs: number): this {
    if (ttlMs < 0 || ttlMs > 2 ** 32 - 1) {
      throw new Error(
        `Cache TTL must be between 0 and ${2 ** 32 - 1} milliseconds`,
      );
    }

    this.cacheTtlMs = ttlMs;

    return this;
  }

  then: PromiseLike<HealthIndicatorResult<Key>>['then'] = (
    onfulfilled,
    onrejected,
  ) => this.execute().then(onfulfilled, onrejected);
}

function toAdditionalData(value: unknown) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  return value as AdditionalData;
}

function errorMessage(err: unknown): string {
  if (isError(err)) {
    return err.message;
  }
  return String(err);
}
