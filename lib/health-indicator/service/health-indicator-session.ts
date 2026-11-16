import { type LoggerService } from '@nestjs/common';
import {
  type HealthIndicatorResult,
  HealthIndicatorStatus,
} from './health-indicator-result.interface.js';
import { AttemptCache } from './attempt-cache.js';
import { HealthCheckAttempt } from './health-check-attempt.js';

type AdditionalData = Record<string, unknown>;

/**
 * Show a compilation error if `status` is used in the additional data.
 */
type WithoutStatus<TData> = {
  [TDataKey in keyof TData]: TDataKey extends 'status'
    ? never
    : TData[TDataKey];
};

/**
 * Indicate the health of a health indicator with the given key
 *
 * @publicApi
 */
export class HealthIndicatorSession<TKey extends Readonly<string> = string> {
  constructor(
    private readonly key: TKey,
    private readonly cache = new AttemptCache(),
    private readonly logger?: LoggerService,
  ) {}

  private assertNotReserved(data: AdditionalData, keys: readonly string[]) {
    for (const key of keys) {
      if (key in data) {
        throw new Error(
          `"${key}" is a reserved key and cannot be used in additional data`,
        );
      }
    }
  }

  private compose<TStatus extends HealthIndicatorStatus>(
    status: TStatus,
    data?: AdditionalData | string,
  ): HealthIndicatorResult<TKey, TStatus> {
    let additionalData: AdditionalData = {};

    if (typeof data === 'string') {
      additionalData = { message: data };
    } else if (typeof data === 'object' && data !== null) {
      additionalData = data;
    }

    this.assertNotReserved(additionalData, ['status']);

    const detail = { ...additionalData, status };

    return {
      [this.key]: detail,
      // TypeScript does not infer this.key as TKey correctly.
    } as Record<TKey, typeof detail>;
  }

  /**
   * Mark the health indicator as `down`
   * @param data additional data which will get appended to the result object
   * @remarks The `status` key is reserved and cannot be used in additional data.
   */
  down<TData extends AdditionalData>(
    data?: TData & WithoutStatus<TData>,
  ): HealthIndicatorResult<TKey, HealthIndicatorStatus.DOWN, TData>;
  down<TMessage extends string>(
    data?: TMessage,
  ): HealthIndicatorResult<
    TKey,
    HealthIndicatorStatus.DOWN,
    { message: TMessage }
  >;
  down(
    data?: AdditionalData | string,
  ): HealthIndicatorResult<TKey, HealthIndicatorStatus.DOWN> {
    return this.compose(HealthIndicatorStatus.DOWN, data);
  }

  /**
   * Mark the health indicator as `degraded`: still serving, but impaired.
   * A degraded indicator does not fail the health check; the overall status
   * becomes `degraded` and the HTTP status stays 200.
   * @param data additional data which will get appended to the result object
   * @remarks The `status` key is reserved and cannot be used in additional data.
   */
  degraded<TData extends AdditionalData>(
    data?: TData & WithoutStatus<TData>,
  ): HealthIndicatorResult<TKey, HealthIndicatorStatus.DEGRADED, TData>;
  degraded<TMessage extends string>(
    data?: TMessage,
  ): HealthIndicatorResult<
    TKey,
    HealthIndicatorStatus.DEGRADED,
    { message: TMessage }
  >;
  degraded(
    data?: AdditionalData | string,
  ): HealthIndicatorResult<TKey, HealthIndicatorStatus.DEGRADED> {
    return this.compose(HealthIndicatorStatus.DEGRADED, data);
  }

  /**
   * Mark the health indicator as `up`
   * @param data additional data which will get appended to the result object
   * @remarks The `status` key is reserved and cannot be used in additional data.
   */
  up<TData extends AdditionalData>(
    data?: TData & WithoutStatus<TData>,
  ): HealthIndicatorResult<TKey, HealthIndicatorStatus.UP, TData>;
  up<TMessage extends string>(
    data?: TMessage,
  ): HealthIndicatorResult<
    TKey,
    HealthIndicatorStatus.UP,
    { message: TMessage }
  >;
  up(
    data?: AdditionalData | string,
  ): HealthIndicatorResult<TKey, HealthIndicatorStatus.UP> {
    return this.compose(HealthIndicatorStatus.UP, data);
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
   * version ignores it. Use `.withSuccessData()` to choose what gets added.
   *
   * @example
   * ```typescript
   * this.healthIndicatorService
   *   .check('db')
   *   .attempt(async () => { await sql`SELECT 1` })
   *
   * this.healthIndicatorService
   *   .check('mongo')
   *   .attempt(() => db.command({ ping: 1 }))
   *   .withSuccessData((res) => ({ ok: res.ok }))
   *
   * this.healthIndicatorService
   *   .check('external')
   *   .attempt(async ({ signal }) => { await fetch('https://example.com', { signal }) })
   *   .withTimeout(3000)
   * ```
   */
  attempt<TResult>(
    fn: (options: { signal: AbortSignal }) => TResult,
  ): HealthCheckAttempt<TKey, Awaited<TResult>> {
    return new HealthCheckAttempt(this.key, fn, this.cache, this.logger);
  }
}
