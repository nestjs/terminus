import { Logger } from '@nestjs/common';
import { errorMessage } from '../../utils/errorMessage.js';
import { runWithTimeout } from '../../utils/runWithTimeout.js';

export type AdditionalData = Record<string, unknown>;
type DataFn = (input: unknown) => unknown;

/** The keys Terminus sets on every result. */
const RESERVED_ATTEMPT_KEYS = [
  'status',
  'responseTime',
  'cachedResponse',
] as const;

const logger = new Logger('HealthIndicatorService');

/**
 * The data of one health check attempt: the static data of `withData()` and
 * the functions of `withSuccessData()` and `withFailureData()`. Turns them
 * into the data added to a successful or a failed result.
 *
 * Calls are merged, the last one wins. Reserved keys are dropped with one
 * warning per indicator, never thrown.
 *
 * @internal
 */
export class AttemptData {
  private staticValues: AdditionalData = {};
  // FIXME: Always an array in v13 (#2796)
  // Stays `undefined` until `withSuccessData()` is called. Until then, the
  // value returned by the attempt function is used as the data (deprecated).
  private successFns?: DataFn[];
  private failureFns: DataFn[] = [];

  /**
   * @param key The indicator key, used in the warnings
   */
  constructor(private readonly key: string) {}

  /** The static data, added to every result. */
  get staticData(): AdditionalData {
    return this.staticValues;
  }

  /** Merge static data, from `withData()`. */
  addStatic(data: object): void {
    this.staticValues = {
      ...this.staticValues,
      ...this.toData(data),
    };
  }

  /** Add a function or an object, from `withSuccessData()`. */
  addSuccess(data: object): void {
    this.successFns = [...(this.successFns ?? []), toDataFn(data)];
  }

  /** Add a function or an object, from `withFailureData()`. */
  addFailure(data: object): void {
    this.failureFns = [...this.failureFns, toDataFn(data)];
  }

  /**
   * The data to add to a successful result: from `withSuccessData()`, or the
   * returned value (deprecated). Throws if a function throws or rejects: then
   * the check is down.
   *
   * @param result The value returned by the attempt function
   */
  async forSuccess(result: unknown): Promise<AdditionalData> {
    // FIXME: In v13, ignore the returned value and return `{}` without `withSuccessData()` (#2796)
    if (this.successFns) {
      let data: AdditionalData = {};
      for (const fn of this.successFns) {
        const value = await fn(result);
        data = { ...data, ...this.toData(value) };
      }
      return data;
    }

    const data = this.toData(result);
    if (Object.keys(data).length > 0) {
      warnOnce(
        `implicit-data:${this.key}`,
        `The value returned by attempt() for health indicator "${this.key}" is added to the health check result. ` +
          `This is deprecated: the next major version ignores it. Use .withSuccessData() to choose the data to add, or return nothing.`,
      );
    }

    return data;
  }

  /**
   * The data to add to a failed result, from `withFailureData()`. Each
   * function runs in what is left of the timeout. Never throws: a function
   * that fails is skipped with a warning.
   *
   * @param error The error of the attempt
   * @param timeoutMs The timeout of the attempt, or `undefined` for none
   * @param start When the attempt started, from `performance.now()`
   */
  async forFailure(
    error: unknown,
    timeoutMs: number | undefined,
    start: number,
  ): Promise<AdditionalData> {
    let data: AdditionalData = {};

    for (const fn of this.failureFns) {
      let remainingMs: number | undefined;
      if (timeoutMs !== undefined) {
        const elapsedMs = performance.now() - start;
        remainingMs = Math.max(0, Math.floor(timeoutMs - elapsedMs));
      }

      try {
        const value = await runWithTimeout(remainingMs, () => fn(error));
        data = { ...data, ...this.toData(value) };
      } catch (err) {
        warnOnce(
          `failure-data:${this.key}`,
          `Could not add the failure data to health indicator "${this.key}", withFailureData() failed: ${errorMessage(err)}`,
        );
      }
    }

    return data;
  }

  /**
   * A copy of `value` without the reserved keys, or `{}` if it is not an
   * object. Reserved keys are dropped with a warning, never thrown.
   */
  private toData(value: unknown): AdditionalData {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) {
      return {};
    }

    const data: AdditionalData = { ...value };

    const ignored = RESERVED_ATTEMPT_KEYS.filter((k) => k in data);
    for (const k of ignored) {
      delete data[k];
    }

    if (ignored.length > 0) {
      warnOnce(
        `reserved-keys:${this.key}`,
        `Ignoring reserved key(s) ${ignored.map((k) => `"${k}"`).join(', ')} in the data of health indicator "${this.key}". ` +
          `The keys ${RESERVED_ATTEMPT_KEYS.join(', ')} are set by Terminus, use other names.`,
      );
    }

    return data;
  }
}

const warned = new Set<string>();

function warnOnce(id: string, message: string) {
  if (warned.has(id)) {
    return;
  }
  warned.add(id);
  logger.warn(message);
}

/** A function as is, or an object wrapped in a function that returns it. */
function toDataFn(data: object): DataFn {
  if (typeof data === 'function') {
    return data as DataFn;
  }
  return () => data;
}
