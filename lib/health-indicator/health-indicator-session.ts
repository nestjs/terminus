import {
  type HealthIndicatorResult,
  type HealthIndicatorStatus,
} from './health-indicator-result.interface.js';
import { AttemptCache } from './attempt-cache.js';
import {
  type AttemptOutcome,
  HealthCheckAttempt,
} from './health-check-attempt.js';

/**
 * Show a compilation error if `status` is used in the additional data.
 */
type WithoutStatus<TData> = {
  [K in keyof TData]: K extends 'status' ? never : TData[K];
};

export type AdditionalData = Record<string, unknown>;

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
    private readonly cache: AttemptCache<AttemptOutcome> = new AttemptCache(),
  ) {}

  private compose<TStatus extends HealthIndicatorStatus>(
    status: TStatus,
    data?: AdditionalData | string,
  ): HealthIndicatorResult<Key, TStatus> {
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

  // FIXME: Remove the deprecation note from the JSDoc in v13 (#2796)
  /**
   * Attempt to execute a function and mark the health indicator as `up` or `down` based on whether it throws.
   * Returns a `HealthCheckAttempt` builder that can be further configured (e.g. `.withTimeout()`).
   *
   * @param fn The function to execute
   * @returns A `HealthCheckAttempt` builder
   * @remarks The `status`, `responseTime` and `cachedResponse` keys are reserved; if present in the returned data they are ignored and a warning is logged once.
   * Adding the value returned by `fn` to the result is deprecated and logs a warning once; the next major
   * version ignores it. Use `.withData()` to choose what gets added.
   *
   * @example
   * ```typescript
   * this.healthIndicatorService
   *   .check('db')
   *   .attempt(async () => sql`SELECT(1)`)
   *
   * this.healthIndicatorService
   *   .check('mongo')
   *   .attempt(() => db.command({ ping: 1 }))
   *   .withData((res) => ({ ok: res.ok }))
   *
   * this.healthIndicatorService
   *   .check('external')
   *   .attempt(async ({ signal }) => { await fetch('https://example.com', { signal }) })
   *   .withTimeout(3000)
   * ```
   */
  attempt<TResult>(
    fn: (options: { signal: AbortSignal }) => TResult,
  ): HealthCheckAttempt<Key, Awaited<TResult>> {
    return new HealthCheckAttempt<Key, Awaited<TResult>>(
      this.key,
      fn,
      this.cache,
    );
  }
}
