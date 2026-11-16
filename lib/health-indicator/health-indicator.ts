import { type HealthIndicatorResult } from './index.js';
import { type HealthCheckAttempt } from './service/health-check-attempt.js';

/**
 * A health indicator function for a health check
 *
 * @publicApi
 */
export type HealthIndicatorFunction =
  | (() => PromiseLike<HealthIndicatorResult> | HealthIndicatorResult)
  | (() => PromiseLike<HealthCheckAttempt> | HealthCheckAttempt)
  | HealthCheckAttempt;
