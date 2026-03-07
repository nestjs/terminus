import { type HealthIndicatorResult } from './';

/**
 * A health indicator function for a health check
 *
 * @publicApi
 */
export type HealthIndicatorFunction = () =>
  | PromiseLike<HealthIndicatorResult>
  | HealthIndicatorResult;
