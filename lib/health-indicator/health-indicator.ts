import { type HealthIndicatorResult } from './';
import { type HealthCheckAttempt } from './health-indicator.service';

/**
 * A health indicator function for a health check
 *
 * @publicApi
 */
export type HealthIndicatorFunction =
  | (() => PromiseLike<HealthIndicatorResult> | HealthIndicatorResult)
  | (() => PromiseLike<HealthCheckAttempt> | HealthCheckAttempt);
