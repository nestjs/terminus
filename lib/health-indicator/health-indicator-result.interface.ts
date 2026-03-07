import { type HealthIndicatorFunction } from './health-indicator';
import { type HealthCheckAttempt } from './health-indicator.service';

/**
 * @publicApi
 */
export type HealthIndicatorStatus = 'up' | 'down';

/**
 * The result object of a health indicator
 * @publicApi
 */
export type HealthIndicatorResult<
  Key extends string = string,
  Status extends HealthIndicatorStatus = HealthIndicatorStatus,
  OptionalData extends Record<string, any> = Record<string, any>,
> = Record<Key, { status: Status } & OptionalData>;

/**
 * @internal
 */
export type InferHealthIndicatorResult<
  Fn extends HealthIndicatorFunction = HealthIndicatorFunction,
> = Fn extends HealthCheckAttempt
  ? HealthIndicatorResult
  : Fn extends (...args: any) => any
    ? Awaited<ReturnType<Fn>>
    : HealthIndicatorResult;

/**
 * @internal
 */
export type InferHealthIndicatorResults<
  Fns extends readonly HealthIndicatorFunction[] = HealthIndicatorFunction[],
  R extends readonly any[] = [],
> = Fns extends readonly [
  infer Fn extends HealthIndicatorFunction,
  ...infer Rest extends readonly HealthIndicatorFunction[],
]
  ? InferHealthIndicatorResults<Rest, [...R, Fn]> &
      InferHealthIndicatorResult<Fn>
  : HealthIndicatorResult;
