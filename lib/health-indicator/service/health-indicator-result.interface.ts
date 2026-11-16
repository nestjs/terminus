import { type HealthIndicatorFunction } from '../health-indicator.js';

/**
 * The statuses a health indicator can have.
 *
 * @publicApi
 */
export const HealthIndicatorStatus = {
  UP: 'up',
  DEGRADED: 'degraded',
  DOWN: 'down',
} as const;

/**
 * @publicApi
 */
export type HealthIndicatorStatus =
  (typeof HealthIndicatorStatus)[keyof typeof HealthIndicatorStatus];

/**
 * Lets you use a single status as a type, like with an enum:
 * `HealthIndicatorStatus.UP`.
 *
 * @publicApi
 */
export declare namespace HealthIndicatorStatus {
  type UP = typeof HealthIndicatorStatus.UP;
  type DEGRADED = typeof HealthIndicatorStatus.DEGRADED;
  type DOWN = typeof HealthIndicatorStatus.DOWN;
}

/**
 * The result object of a health indicator
 * @publicApi
 */
export type HealthIndicatorResult<
  TKey extends string = string,
  TStatus extends HealthIndicatorStatus = HealthIndicatorStatus,
  TData extends Record<string, any> = Record<string, any>,
> = Record<TKey, { status: TStatus } & TData>;

/**
 * @internal
 */
export type InferHealthIndicatorResult<
  TFn extends HealthIndicatorFunction = HealthIndicatorFunction,
> = TFn extends (...args: any) => any ? Awaited<ReturnType<TFn>> : Awaited<TFn>;

/**
 * @internal
 */
export type InferHealthIndicatorResults<
  TFns extends readonly HealthIndicatorFunction[] = HealthIndicatorFunction[],
  TResults extends readonly any[] = [],
> = TFns extends readonly [
  infer TFn extends HealthIndicatorFunction,
  ...infer TRest extends readonly HealthIndicatorFunction[],
]
  ? InferHealthIndicatorResults<TRest, [...TResults, TFn]> &
      InferHealthIndicatorResult<TFn>
  : HealthIndicatorResult;
