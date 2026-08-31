import { type HealthIndicatorResult } from '../health-indicator/index.js';

/**
 * @publicApi
 */
export type HealthCheckStatus = 'error' | 'ok' | 'degraded' | 'shutting_down';

/**
 * The result of a health check
 * @publicApi
 */
export type HealthCheckResult<
  TDetails extends HealthIndicatorResult = HealthIndicatorResult,
  TInfo extends Partial<HealthIndicatorResult> | undefined =
    | Partial<TDetails>
    | undefined,
  TError extends Partial<HealthIndicatorResult> | undefined =
    | Partial<TDetails>
    | undefined,
> = {
  /**
   * The overall status of the Health Check
   */
  status: HealthCheckStatus;
  /**
   * The info object contains information of each health indicator
   * which is of status "up" or "degraded"
   */
  info?: TInfo;
  /**
   * The error object contains information of each health indicator
   * which is of status "down"
   */
  error?: TError;
  /**
   * The details object contains information of every health indicator.
   */
  details: TDetails;
};
