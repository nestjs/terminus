import { HealthIndicatorStatus } from './health-indicator-result.interface.js';
import { errorMessage } from '../../utils/errorMessage.js';
import { type Merge } from '../../utils/types.js';
import { runWithTimeout } from '../../utils/runWithTimeout.js';
import { type Duration, toMs } from '../../utils/units.js';
import { type AttemptCache } from './attempt-cache.js';
import { AttemptData } from './attempt-data.js';

type AdditionalData = Record<string, unknown>;

// FIXME: Delete this type in v13 and use `Merge<TStatic, TSuccess>` in its
// place: the returned value is ignored then (#2796)
/**
 * The data of a successful check: the static and the success data.
 *
 * `TSuccess` is `undefined` until `withSuccessData()` is called. Until then,
 * the value returned by the attempt function is added to the result
 * (deprecated), so any key is possible.
 */
type SuccessData<TStatic, TSuccess> = TSuccess extends object
  ? Merge<TStatic, TSuccess>
  : TStatic & Record<string, any>;

/**
 * What awaiting a `HealthCheckAttempt` resolves to: one entry under the
 * indicator key. The entry is either a success with the static and success
 * data, or a failure with an error `message`, the static and the failure data.
 * Narrow on `status` to tell them apart.
 */
type HealthCheckAttemptResult<
  Key extends string,
  TStatic,
  TSuccess,
  TFailure,
> = Record<
  Key,
  | ({
      status: HealthIndicatorStatus.UP | HealthIndicatorStatus.DEGRADED;
      responseTime: number;
      cachedResponse?: true;
    } & SuccessData<TStatic, TSuccess>)
  | ({
      status: HealthIndicatorStatus.DOWN | HealthIndicatorStatus.DEGRADED;
      message: string;
      responseTime: number;
      cachedResponse?: true;
    } & Merge<TStatic, TFailure>)
>;

export type AttemptOutcome = {
  status: HealthIndicatorStatus.UP | HealthIndicatorStatus.DOWN;
  data: AdditionalData;
  responseTime: number;
};

function assertDuration(ms: number, name: string) {
  if (!Number.isInteger(ms) || ms < 0 || ms > 2 ** 32 - 1) {
    throw new Error(
      `${name} must be a whole number between 0 and ${2 ** 32 - 1} milliseconds, got ${ms}`,
    );
  }
}

/**
 * A builder that describes a health check attempt.
 *
 * @publicApi
 */
export class HealthCheckAttempt<
  Key extends Readonly<string> = string,
  TResult = unknown,
  /** The data of `withData()`, added to every result */
  TStatic extends object = {},
  // FIXME: In v13, drop `undefined` and start with `{}` like the other data (#2796)
  /** The data of `withSuccessData()`. `undefined` until it is called */
  TSuccess extends object | undefined = undefined,
  /** The data of `withFailureData()`, added to a failed result */
  TFailure extends object = {},
> implements Promise<
  HealthCheckAttemptResult<Key, TStatic, TSuccess, TFailure>
> {
  private timeoutMs?: number;
  private cacheTtlMs?: number;
  private degradedAfterMs?: number;
  private degradeFailure = false;
  private readonly data: AttemptData;

  /** @internal */
  constructor(
    private readonly key: Key,
    private readonly fn: (options: { signal: AbortSignal }) => unknown,
    private readonly cache: AttemptCache<AttemptOutcome>,
  ) {
    this.data = new AttemptData(key);
  }

  private toResult(
    outcome: AttemptOutcome,
    cachedResponse = false,
  ): HealthCheckAttemptResult<Key, TStatic, TSuccess, TFailure> {
    // The static data is not cached: attempts with the same key can have their own.
    const detail = {
      ...this.data.staticData,
      ...outcome.data,
      responseTime: outcome.responseTime,
      ...(cachedResponse && { cachedResponse: true }),
      status: this.toStatus(outcome),
    };

    return { [this.key]: detail } as HealthCheckAttemptResult<
      Key,
      TStatic,
      TSuccess,
      TFailure
    >;
  }

  /**
   * Applied to each result and not cached: attempts with the same key share
   * the cache, but can have different `degraded` settings.
   */
  private toStatus(outcome: AttemptOutcome): HealthIndicatorStatus {
    const failed = outcome.status === HealthIndicatorStatus.DOWN;

    if (failed && this.degradeFailure) {
      return HealthIndicatorStatus.DEGRADED;
    }
    if (failed) {
      return HealthIndicatorStatus.DOWN;
    }
    if (
      this.degradedAfterMs !== undefined &&
      outcome.responseTime >= this.degradedAfterMs
    ) {
      return HealthIndicatorStatus.DEGRADED;
    }

    return HealthIndicatorStatus.UP;
  }

  private async execute(): Promise<
    HealthCheckAttemptResult<Key, TStatic, TSuccess, TFailure>
  > {
    if (this.cacheTtlMs === undefined) {
      return this.toResult(await this.run());
    }

    const { value, cached } = await this.cache.getOrRun(
      this.key,
      this.cacheTtlMs,
      () => this.run(),
    );
    return this.toResult(value, cached);
  }

  private async run(): Promise<AttemptOutcome> {
    const start = performance.now();

    let outcome: Omit<AttemptOutcome, 'responseTime'>;
    try {
      // `withSuccessData()` runs inside the try and the timeout: if it throws or is slow, the check is down.
      const data = await runWithTimeout(this.timeoutMs, async (signal) =>
        this.data.forSuccess(await this.fn({ signal })),
      );
      outcome = { status: HealthIndicatorStatus.UP, data };
    } catch (err) {
      const failureData = await this.data.forFailure(
        err,
        this.timeoutMs,
        start,
      );
      outcome = {
        status: HealthIndicatorStatus.DOWN,
        // The failure data can replace the message, e.g. to hide details
        data: { message: errorMessage(err), ...failureData },
      };
    }

    return { ...outcome, responseTime: Math.round(performance.now() - start) };
  }

  /**
   * Set a timeout for the health check attempt.
   * If the function does not resolve within the given time, the health indicator will be marked as `down`
   * An `AbortSignal` is passed to the callback so the underlying operation can be cancelled.
   *
   * @param timeout The timeout in milliseconds, or a string such as `'2s'`
   * @returns this (for chaining)
   */
  withTimeout(timeout: Duration): this {
    const ms = toMs(timeout, 'Timeout');
    assertDuration(ms, 'Timeout');

    this.timeoutMs = ms;

    return this;
  }

  /**
   * Add static data to every result, also when the check fails. Use it for
   * labels like an owner or a runbook link.
   *
   * Calls are merged, the last one wins.
   *
   * @param data The static data
   * @returns this (for chaining)
   * @remarks The `status`, `responseTime` and `cachedResponse` keys are reserved and ignored.
   *
   * @example
   * ```typescript
   * .attempt(() => billing.ping())
   * .withData({ owner: 'team-billing' })
   * ```
   */
  withData<const TData extends object>(
    data: TData,
  ): HealthCheckAttempt<
    Key,
    TResult,
    Merge<TStatic, TData>,
    TSuccess,
    TFailure
  >;
  withData(data: object): this {
    this.data.addStatic(data);

    return this;
  }

  // FIXME: Remove the deprecation note from the JSDoc in v13 (#2796)
  /**
   * Add data to the result when the check succeeds. The function receives the
   * value returned by the attempt function. If it throws, the check is `down`.
   *
   * Without it, the returned value itself is added (deprecated, ignored in
   * the next major).
   *
   * Calls are merged, the last one wins.
   *
   * @param data A function receiving the resolved value, or an object
   * @returns this (for chaining)
   * @remarks The `status`, `responseTime` and `cachedResponse` keys are reserved and ignored.
   *
   * @example
   * ```typescript
   * .attempt(() => db.command({ ping: 1 }))
   * .withSuccessData((res) => ({ ok: res.ok }))
   * ```
   */
  withSuccessData<const TData extends object>(
    fn: (result: TResult) => TData,
  ): HealthCheckAttempt<
    Key,
    TResult,
    TStatic,
    Merge<TSuccess, Awaited<TData>>,
    TFailure
  >;
  withSuccessData<const TData extends object>(
    data: TData,
  ): HealthCheckAttempt<
    Key,
    TResult,
    TStatic,
    Merge<TSuccess, TData>,
    TFailure
  >;
  withSuccessData(data: object | ((result: TResult) => unknown)): this {
    this.data.addSuccess(data);

    return this;
  }

  /**
   * Add data to the result when the check fails, next to the error `message`.
   * The function receives the error. If it throws, it is skipped.
   * A `message` in the data replaces the error message.
   *
   * Calls are merged, the last one wins.
   *
   * @param data A function receiving the error, or an object
   * @returns this (for chaining)
   * @remarks The `status`, `responseTime` and `cachedResponse` keys are reserved and ignored.
   *
   * @example
   * ```typescript
   * .attempt(() => payments.ping())
   * .withFailureData((error) => ({ code: (error as PaymentError).code }))
   * ```
   */
  withFailureData<const TData extends object>(
    fn: (error: unknown) => TData,
  ): HealthCheckAttempt<
    Key,
    TResult,
    TStatic,
    TSuccess,
    Merge<TFailure, Awaited<TData>>
  >;
  withFailureData<const TData extends object>(
    data: TData,
  ): HealthCheckAttempt<
    Key,
    TResult,
    TStatic,
    TSuccess,
    Merge<TFailure, TData>
  >;
  withFailureData(data: object | ((error: unknown) => unknown)): this {
    this.data.addFailure(data);

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
   * @param ttl Time to live in milliseconds, or a string such as `'15s'`
   * @returns this (for chaining)
   */
  cacheFor(ttl: Duration): this {
    const ttlMs = toMs(ttl, 'Cache TTL');
    assertDuration(ttlMs, 'Cache TTL');

    this.cacheTtlMs = ttlMs;

    return this;
  }

  /**
   * Mark the check as `degraded` instead of `up` when it succeeds but takes
   * `threshold` or longer (measured by `responseTime`). Combine with `.withTimeout()`
   * to mark it as `down` when it is too slow.
   * The data from `.withSuccessData()` is still added.
   *
   * @param threshold The response time from which the check is degraded, in
   * milliseconds or as a string such as `'300ms'`
   * @returns this (for chaining)
   *
   * @example
   * ```typescript
   * // < 200ms: up, 200–1000ms: degraded, > 1000ms: down
   * this.db.pingCheck('database').degradedAfter(200).withTimeout('1s')
   * ```
   */
  degradedAfter(threshold: Duration): this {
    const ms = toMs(threshold, 'Degraded threshold');
    assertDuration(ms, 'Degraded threshold');

    this.degradedAfterMs = ms;

    return this;
  }

  /**
   * Mark the check as `degraded` instead of `down` when it fails (throws,
   * rejects or times out). Use it for dependencies that are not critical:
   * a degraded check does not fail the health check.
   * The error `message` stays in the result.
   *
   * @returns this (for chaining)
   *
   * @example
   * ```typescript
   * this.healthIndicatorService
   *   .check('recommendations')
   *   .attempt(async ({ signal }) => { await fetch(url, { signal }) })
   *   .degradedOnFailure()
   * ```
   */
  degradedOnFailure(): this {
    this.degradeFailure = true;

    return this;
  }

  // `then`, `catch` and `finally` make the attempt usable wherever a promise
  // is expected. Each call runs the attempt, like awaiting it does.
  then: Promise<
    HealthCheckAttemptResult<Key, TStatic, TSuccess, TFailure>
  >['then'] = (onfulfilled, onrejected) =>
    this.execute().then(onfulfilled, onrejected);

  catch: Promise<
    HealthCheckAttemptResult<Key, TStatic, TSuccess, TFailure>
  >['catch'] = (onrejected) => this.execute().catch(onrejected);

  finally: Promise<
    HealthCheckAttemptResult<Key, TStatic, TSuccess, TFailure>
  >['finally'] = (onfinally) => this.execute().finally(onfinally);

  readonly [Symbol.toStringTag] = 'HealthCheckAttempt';
}
