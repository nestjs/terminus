import { Logger } from '@nestjs/common';
import { type HealthIndicatorStatus } from './health-indicator-result.interface.js';
import { type AdditionalData } from './health-indicator-session.js';
import { errorMessage } from '../utils/errorMessage.js';
import { type IsAny } from '../utils/types.js';
import { runWithTimeout } from '../utils/runWithTimeout.js';
import { type AttemptCache } from './attempt-cache.js';

type ReservedAttemptKey = (typeof RESERVED_ATTEMPT_KEYS)[number];

/** `true` if any member of a union can't be used as data. */
type IsInvalidData<TValue> = TValue extends
  | readonly unknown[]
  | ((...args: never[]) => unknown)
  ? true
  : TValue extends object
    ? Extract<keyof TValue, ReservedAttemptKey> extends never
      ? false
      : true
    : true;

/**
 * `unknown` (a no-op in an intersection) if `TData` resolves to an object
 * without reserved keys, otherwise `never` to show a compilation error.
 * `any` is let through as an escape hatch.
 */
type WithDataCheck<TData> =
  IsAny<Awaited<TData>> extends true
    ? unknown
    : true extends IsInvalidData<Awaited<TData>>
      ? never
      : unknown;

/**
 * What the builder methods of a `HealthCheckAttempt` have set up so far, as far
 * as the type of the result depends on it.
 */
export type AttemptState = {
  /** The additional data of a successful check */
  data: object;
  /** Whether the result can come from the cache */
  cached: boolean;
  /** The statuses of a successful check */
  success: 'up' | 'degraded';
  /** The statuses of a failed check */
  failure: 'down' | 'degraded';
};

/** The state of the attempt that `attempt()` returns. */
export type InitialAttemptState = {
  data: Record<string, any>;
  cached: false;
  success: 'up';
  failure: 'down';
};

/** `TState` with the fields of `TChange` replaced. */
type With<
  TState extends AttemptState,
  TChange extends Partial<AttemptState>,
> = {
  [K in keyof AttemptState]: K extends keyof TChange
    ? NonNullable<TChange[K]>
    : TState[K];
};

/**
 * What awaiting a `HealthCheckAttempt` resolves to: one entry under the
 * indicator key. The entry is either a success with the additional data, or a
 * failure with an error `message`. Narrow on `status` to tell them apart.
 */
type HealthCheckAttemptResult<
  Key extends string,
  TState extends AttemptState,
> = Record<
  Key,
  (
    | ({ status: TState['success']; responseTime: number } & TState['data'])
    | { status: TState['failure']; message: string; responseTime: number }
  ) &
    (TState['cached'] extends true ? { cachedResponse?: true } : unknown)
>;

export type AttemptOutcome = {
  status: HealthIndicatorStatus;
  data: AdditionalData;
  responseTime: number;
};

const RESERVED_ATTEMPT_KEYS = [
  'status',
  'responseTime',
  'cachedResponse',
] as const;
const logger = new Logger('HealthIndicatorService');
const warned = new Set<string>();

function warnOnce(id: string, message: string) {
  if (warned.has(id)) {
    return;
  }
  warned.add(id);
  logger.warn(message);
}

function assertDuration(ms: number, name: string) {
  if (ms < 0 || ms > 2 ** 32 - 1) {
    throw new Error(
      `${name} must be between 0 and ${2 ** 32 - 1} milliseconds`,
    );
  }
}

/**
 * A builder that describes a health check attempt.
 * Use `.withTimeout()` to configure a timeout.
 *
 * @publicApi
 */
export class HealthCheckAttempt<
  Key extends Readonly<string> = string,
  TResult = unknown,
  // The default allows every status, so any attempt is assignable to `HealthCheckAttempt<Key>`.
  TState extends AttemptState = With<
    InitialAttemptState,
    Pick<AttemptState, 'success' | 'failure'>
  >,
> implements PromiseLike<HealthCheckAttemptResult<Key, TState>> {
  private timeoutMs?: number;
  private cacheTtlMs?: number;
  private degradedAfterMs?: number;
  private degradeFailure = false;
  // Typed loosely so `HealthCheckAttempt<Key, TResult>` stays assignable to `HealthCheckAttempt<Key>`.
  private dataFn?: (result: never) => Promise<unknown> | unknown;

  constructor(
    private readonly key: Key,
    private readonly fn: (options: { signal: AbortSignal }) => unknown,
    private readonly cache: AttemptCache<AttemptOutcome>,
  ) {}

  private toResult(
    outcome: AttemptOutcome,
    cachedResponse = false,
  ): HealthCheckAttemptResult<Key, TState> {
    const detail = {
      ...outcome.data,
      responseTime: outcome.responseTime,
      ...(cachedResponse && { cachedResponse: true }),
      status: outcome.status,
    };

    return { [this.key]: detail } as HealthCheckAttemptResult<Key, TState>;
  }

  private async execute(): Promise<HealthCheckAttemptResult<Key, TState>> {
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
      // `withData()` runs inside the try and the timeout: if it throws or is slow, the check is down.
      const data = await runWithTimeout(this.timeoutMs, async (signal) =>
        this.toAdditionalData(await this.fn({ signal })),
      );
      outcome = { status: 'up', data };
    } catch (err) {
      outcome = {
        status: this.degradeFailure ? 'degraded' : 'down',
        data: { message: errorMessage(err) },
      };
    }

    const responseTime = Math.round(performance.now() - start);
    if (
      outcome.status === 'up' &&
      this.degradedAfterMs !== undefined &&
      responseTime >= this.degradedAfterMs
    ) {
      outcome.status = 'degraded';
    }

    return { ...outcome, responseTime };
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
    assertDuration(ms, 'Timeout');

    this.timeoutMs = ms;

    return this;
  }

  // FIXME: Remove the deprecation note from the JSDoc in v13 (#2796)
  /**
   * Choose the data added to the result when the check is `up`.
   * Without `.withData()`, the value returned by the function is added (deprecated, ignored in the next major).
   *
   * Pass a function to pick data from the value returned by the attempt
   * function (sync or async), or an object to add static data. Not called when the check is
   * `down`; if the function throws, the check is marked as `down`.
   * With `.cacheFor()`, the picked data is cached.
   *
   * @param data Static data, or a function receiving the attempt function's resolved value
   * @returns this (for chaining)
   * @remarks The `status`, `responseTime` and `cachedResponse` keys are reserved and ignored.
   *
   * @example
   * ```typescript
   * this.healthIndicatorService
   *   .check('mongo')
   *   .attempt(() => db.command({ ping: 1 }))
   *   .withData((res) => ({ ok: res.ok }))
   *
   * this.healthIndicatorService
   *   .check('billing')
   *   .attempt(() => billing.ping())
   *   .withData({ owner: 'team-billing' })
   * ```
   */
  withData<const TPicked extends object>(
    fn: (result: TResult) => TPicked & WithDataCheck<TPicked>,
  ): HealthCheckAttempt<Key, TResult, With<TState, { data: Awaited<TPicked> }>>;
  withData<const TPicked extends object>(
    data: TPicked & WithDataCheck<TPicked>,
  ): HealthCheckAttempt<Key, TResult, With<TState, { data: TPicked }>>;
  withData(
    data: object | ((result: TResult) => unknown),
  ): HealthCheckAttempt<Key, TResult, With<TState, { data: object }>> {
    this.dataFn =
      typeof data === 'function'
        ? (data as (result: TResult) => unknown)
        : () => data;

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
  cacheFor(
    ttlMs: number,
  ): HealthCheckAttempt<Key, TResult, With<TState, { cached: true }>> {
    assertDuration(ttlMs, 'Cache TTL');

    this.cacheTtlMs = ttlMs;

    return this;
  }

  /**
   * Mark the check as `degraded` instead of `up` when it succeeds but takes
   * `ms` or longer (measured by `responseTime`). Combine with `.withTimeout()`
   * to mark it as `down` when it is too slow.
   * The data from `.withData()` is still added.
   *
   * @param ms The response time in milliseconds from which the check is degraded
   * @returns this (for chaining)
   *
   * @example
   * ```typescript
   * // < 200ms: up, 200–1000ms: degraded, > 1000ms: down
   * this.db.pingCheck('database').degradedAfter(200).withTimeout(1000)
   * ```
   */
  degradedAfter(
    ms: number,
  ): HealthCheckAttempt<
    Key,
    TResult,
    With<TState, { success: 'up' | 'degraded' }>
  > {
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
  degradedOnFailure(): HealthCheckAttempt<
    Key,
    TResult,
    With<TState, { failure: 'degraded' }>
  > {
    this.degradeFailure = true;

    // A cast, because `this` may still have `down` as failure status
    return this as HealthCheckAttempt<
      Key,
      TResult,
      With<TState, { failure: 'degraded' }>
    >;
  }

  then: PromiseLike<HealthCheckAttemptResult<Key, TState>>['then'] = (
    onfulfilled,
    onrejected,
  ) => this.execute().then(onfulfilled, onrejected);

  /**
   * The data to add to an `up` result: picked by `withData()`, or the
   * returned value (deprecated). Reserved keys are dropped, never thrown.
   */
  private async toAdditionalData(result: unknown): Promise<AdditionalData> {
    // FIXME: In v13, ignore the returned value and return `{}` without `withData()` (#2796)
    let value = result;
    if (this.dataFn) {
      value = await this.dataFn(result as never);
    }

    if (value === null || typeof value !== 'object' || Array.isArray(value)) {
      return {};
    }

    const data: AdditionalData = { ...value };

    // We warn the user that returning data via attempt(() => ({result: 'ok'}))
    // should not be done as it will be removed in v13. https://github.com/nestjs/terminus/issues/2796
    // FIXME: Remove this in v13
    if (!this.dataFn && Object.keys(data).length > 0) {
      warnOnce(
        'implicit-data',
        `The value returned by attempt() for health indicator "${this.key}" is added to the health check result. ` +
          `This is deprecated: the next major version ignores it. Use .withData() to choose the data to add.`,
      );
    }

    const ignored = RESERVED_ATTEMPT_KEYS.filter((k) => k in data);
    for (const k of ignored) {
      delete data[k];
    }

    if (ignored.length > 0) {
      warnOnce(
        'reserved-keys',
        `Ignoring reserved key(s) ${ignored.map((k) => `"${k}"`).join(', ')} in the data of health indicator "${this.key}". ` +
          `The keys ${RESERVED_ATTEMPT_KEYS.join(', ')} are set by Terminus.`,
      );
    }

    return data;
  }
}
