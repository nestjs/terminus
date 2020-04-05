import { HealthIndicatorResult } from '../health-indicator';

/**
 * @publicApi
 */
export type HealthCheckStatus = 'error' | 'ok' | 'shutting_down';

/**
 * The result of a health check
 * @publicApi
 */
export interface HealthCheckResult {
  /**
   * The overall status of the Health Check
   */
  status: HealthCheckStatus;
  /**
   * The info object contains information of each health indicator
   * which is of status "up"
   */
  info?: HealthIndicatorResult;
  /**
   * The error object contains information of each health indicator
   * which is of status "down"
   */
  error?: HealthIndicatorResult;
  /**
   * The details object contains information of every health indicator.
   */
  details: HealthIndicatorResult;
}
