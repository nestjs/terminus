import { Injectable, Logger } from '@nestjs/common';
import {
  type HealthIndicatorResult,
  type HealthIndicatorStatus,
} from './health-indicator-result.interface.js';
import { errorMessage } from '../utils/errorMessage.js';
import { type IsAny } from '../utils/types.js';
import { rejectOnAbort } from '../utils/rejectOnAbort.js';
import { anySignal } from '../utils/anySignal.js';

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
type WithoutStatus<TData> = {
  [K in keyof TData]: K extends 'status' ? never : TData[K];
};

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

type AdditionalData = Record<string, unknown>;

/**
 * The result of a `HealthCheckAttempt`: `up` with the data from `withData()`,
 * or `down` with a message. `cachedResponse` only exists with `cacheFor()`.
 */
type HealthCheckAttemptResult<
  Key extends string,
  TData,
  TCached extends boolean,
> = Record<
  Key,
  (
    | ({ status: 'up'; responseTime: number } & TData)
    | { status: 'down'; message: string; responseTime: number }
  ) &
    (TCached extends true ? { cachedResponse?: true } : unknown)
>;

type AttemptOutcome = {
  status: HealthIndicatorStatus;
  data: AdditionalData;
  responseTime: number;
};

type CacheEntry = {
  promise: Promise<AttemptOutcome>;
  expiresAt: number;
  settled: boolean;
};

const RESERVED_ATTEMPT_KEYS = [
  'status',
  'responseTime',
  'cachedResponse',
] as const;
const logger = new Logger('HealthIndicatorService');
let hasWarnedReservedKeys = false;
// FIXME: Remove this in v13 (#2796)
let hasWarnedImplicitData = false;

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
      this,
      fn,
      this.key,
      this.cache,
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
  TData extends object = Record<string, any>,
  TCached extends boolean = false,
> implements PromiseLike<HealthCheckAttemptResult<Key, TData, TCached>>
{
  private timeoutMs?: number;
  private cacheTtlMs?: number;
  // Typed loosely so `HealthCheckAttempt<Key, TResult>` stays assignable to `HealthCheckAttempt<Key>`.
  private dataFn?: (result: never) => Promise<unknown> | unknown;

  constructor(
    private readonly session: HealthIndicatorSession<Key>,
    private readonly fn: (options: { signal: AbortSignal }) => unknown,
    private readonly cacheKey: string = '',
    private readonly cacheStore: Map<string, CacheEntry> = new Map(),
  ) {}

  private toResult(
    outcome: AttemptOutcome,
    cachedResponse = false,
  ): HealthCheckAttemptResult<Key, TData, TCached> {
    const data = {
      ...outcome.data,
      responseTime: outcome.responseTime,
      ...(cachedResponse && { cachedResponse: true }),
    };

    return (
      outcome.status === 'up' ? this.session.up(data) : this.session.down(data)
    ) as HealthCheckAttemptResult<Key, TData, TCached>;
  }

  private async execute(): Promise<
    HealthCheckAttemptResult<Key, TData, TCached>
  > {
    const ttl = this.cacheTtlMs;
    if (ttl === undefined) {
      return this.toResult(await this.run());
    }

    const cached = this.cacheStore.get(this.cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      const isCacheHit = cached.settled;
      return this.toResult(await cached.promise, isCacheHit);
    }

    const entry: CacheEntry = {
      promise: this.run(),
      expiresAt: Date.now() + ttl,
      settled: false,
    };
    this.cacheStore.set(this.cacheKey, entry);

    const outcome = await entry.promise;
    entry.expiresAt = Date.now() + ttl;
    entry.settled = true;

    return this.toResult(outcome);
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
    const signal = anySignal(signals);

    try {
      const promise = Promise.resolve(this.fn({ signal }));
      const result = await rejectOnAbort(promise, signal);
      // Runs inside the try and the timeout: a throwing or slow `withData()` marks the check as down.
      const data = await this.toAdditionalData(result, signal);

      return {
        status: 'up',
        data,
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
  ): HealthCheckAttempt<Key, TResult, Awaited<TPicked>, TCached>;
  withData<const TPicked extends object>(
    data: TPicked & WithDataCheck<TPicked>,
  ): HealthCheckAttempt<Key, TResult, TPicked, TCached>;
  withData(
    data: object | ((result: TResult) => unknown),
  ): HealthCheckAttempt<Key, TResult, object, TCached> {
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
  cacheFor(ttlMs: number): HealthCheckAttempt<Key, TResult, TData, true> {
    if (ttlMs < 0 || ttlMs > 2 ** 32 - 1) {
      throw new Error(
        `Cache TTL must be between 0 and ${2 ** 32 - 1} milliseconds`,
      );
    }

    this.cacheTtlMs = ttlMs;

    return this;
  }

  then: PromiseLike<HealthCheckAttemptResult<Key, TData, TCached>>['then'] = (
    onfulfilled,
    onrejected,
  ) => this.execute().then(onfulfilled, onrejected);

  /**
   * The data to add to an `up` result: picked by `withData()`, or the
   * returned value (deprecated). Reserved keys are dropped, never thrown.
   */
  private async toAdditionalData(
    result: unknown,
    signal: AbortSignal,
  ): Promise<AdditionalData> {
    // FIXME: In v13, ignore the returned value and return `{}` without `withData()` (#2796)
    let value = result;
    if (this.dataFn) {
      value = await rejectOnAbort(
        Promise.resolve(this.dataFn(result as never)),
        signal,
      );
    }

    if (value === null || typeof value !== 'object' || Array.isArray(value)) {
      return {};
    }

    const data: AdditionalData = { ...value };

    // We warn the user that returning data via attempt(() => ({result: 'ok'}))
    // should not be done as it will be removed in v13. https://github.com/nestjs/terminus/issues/2796
    // FIXME: Remove this in v13
    if (
      !this.dataFn &&
      Object.keys(data).length > 0 &&
      !hasWarnedImplicitData
    ) {
      hasWarnedImplicitData = true;
      logger.warn(
        `The value returned by attempt() for health indicator "${this.cacheKey}" is added to the health check result. ` +
          `This is deprecated: the next major version ignores it. Use .withData() to choose the data to add.`,
      );
    }

    const ignored = RESERVED_ATTEMPT_KEYS.filter((k) => k in data);
    for (const k of ignored) {
      delete data[k];
    }

    if (ignored.length > 0 && !hasWarnedReservedKeys) {
      hasWarnedReservedKeys = true;
      logger.warn(
        `Ignoring reserved key(s) ${ignored.map((k) => `"${k}"`).join(', ')} in the data of health indicator "${this.cacheKey}". ` +
          `The keys ${RESERVED_ATTEMPT_KEYS.join(', ')} are set by Terminus.`,
      );
    }

    return data;
  }
}
