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
  TData extends object = Record<string, any>,
  TCached extends boolean = false,
> implements PromiseLike<HealthCheckAttemptResult<Key, TData, TCached>> {
  private timeoutMs?: number;
  private cacheTtlMs?: number;
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
  ): HealthCheckAttemptResult<Key, TData, TCached> {
    const detail = {
      ...outcome.data,
      responseTime: outcome.responseTime,
      ...(cachedResponse && { cachedResponse: true }),
      status: outcome.status,
    };

    return { [this.key]: detail } as HealthCheckAttemptResult<
      Key,
      TData,
      TCached
    >;
  }

  private async execute(): Promise<
    HealthCheckAttemptResult<Key, TData, TCached>
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
      // `withData()` runs inside the try and the timeout: if it throws or is slow, the check is down.
      const data = await runWithTimeout(this.timeoutMs, async (signal) =>
        this.toAdditionalData(await this.fn({ signal })),
      );
      outcome = { status: 'up', data };
    } catch (err) {
      outcome = { status: 'down', data: { message: errorMessage(err) } };
    }

    return { ...outcome, responseTime: Math.round(performance.now() - start) };
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
    assertDuration(ttlMs, 'Cache TTL');

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
