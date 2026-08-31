import { Injectable } from '@nestjs/common';
import { type HealthIndicatorResult } from './health-indicator-result.interface.js';
import { isError } from '../utils/is-error.js';
import { rejectOnAbort } from '../utils/rejectOnAbort.js';

/**
 * Helper service which can be used to create health indicator results
 * @publicApi
 */
@Injectable()
export class HealthIndicatorService {
  check<const Key extends string>(key: Key) {
    return new HealthIndicatorSession(key);
  }
}

/**
 * Show a compilation error if `status` is used in the additional data.
 */
type WithoutStatus<T> = {
  [K in keyof T]: K extends 'status' ? never : T[K];
};

type AdditionalData = Record<string, unknown>;

/**
 * Indicate the health of a health indicator with the given key
 *
 * @publicApi
 */
export class HealthIndicatorSession<Key extends Readonly<string> = string> {
  constructor(private readonly key: Key) {}

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
  down<T extends AdditionalData | string>(
    data?: T,
  ): HealthIndicatorResult<Key, 'down'> {
    let additionalData: AdditionalData = {};

    if (typeof data === 'string') {
      additionalData = { message: data };
    } else if (typeof data === 'object') {
      additionalData = data;
    }

    if ('status' in additionalData) {
      throw new Error(
        '"status" is a reserved key and cannot be used in additional data',
      );
    }

    const detail = {
      ...additionalData,
      status: 'down' as const,
    };

    return {
      [this.key]: detail,
      // TypeScript does not infer this.key as Key correctly.
    } as Record<Key, typeof detail>;
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
  up<T extends AdditionalData | string>(
    data?: T,
  ): HealthIndicatorResult<Key, 'up'> {
    let additionalData: AdditionalData = {};

    if (typeof data === 'string') {
      additionalData = { message: data };
    } else if (typeof data === 'object') {
      additionalData = data;
    }

    if ('status' in additionalData) {
      throw new Error(
        '"status" is a reserved key and cannot be used in additional data',
      );
    }

    const detail = {
      ...additionalData,
      status: 'up' as const,
    };

    return {
      [this.key]: detail,
      // TypeScript does not infer this.key as Key correctly.
    } as Record<Key, typeof detail>;
  }

  /**
   * Attempt to execute a function and mark the health indicator as `up` or `down` based on whether it throws.
   * Returns a `HealthCheckAttempt` builder that can be further configured (e.g. `.withTimeout()`).
   *
   * @param fn The function to execute
   * @returns A `HealthCheckAttempt` builder
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
    return new HealthCheckAttempt(this, fn);
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

  constructor(
    private readonly session: HealthIndicatorSession<Key>,
    private readonly fn: (options: {
      signal: AbortSignal;
    }) => Promise<AdditionalData | void> | AdditionalData | void,
  ) {}

  private async execute(): Promise<HealthIndicatorResult<Key>> {
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

      return this.session.up(toAdditionalData(result));
    } catch (err) {
      if (timeout?.aborted) {
        return this.session.down(`timeout of ${this.timeoutMs}ms exceeded`);
      }

      return this.session.down(errorMessage(err));
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

  then: PromiseLike<HealthIndicatorResult<Key>>['then'] = (
    onfulfilled,
    onrejected,
  ) => this.execute().then(onfulfilled, onrejected);
}

function toAdditionalData(value: unknown): AdditionalData | undefined {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }
  return value as AdditionalData;
}

function errorMessage(err: unknown): string {
  if (isError(err)) {
    return err.message;
  }
  return String(err);
}
