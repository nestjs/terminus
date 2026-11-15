import { type HealthIndicatorResult } from '../health-indicator/index.js';

/**
 * The statuses a health check can have.
 *
 * @publicApi
 */
export const HealthCheckStatus = {
  ERROR: 'error',
  OK: 'ok',
  DEGRADED: 'degraded',
  SHUTTING_DOWN: 'shutting_down',
} as const;

/**
 * @publicApi
 */
export type HealthCheckStatus =
  (typeof HealthCheckStatus)[keyof typeof HealthCheckStatus];

/**
 * Lets you use a single status as a type, like with an enum:
 * `HealthCheckStatus.ERROR`.
 *
 * @publicApi
 */
export declare namespace HealthCheckStatus {
  type ERROR = typeof HealthCheckStatus.ERROR;
  type OK = typeof HealthCheckStatus.OK;
  type DEGRADED = typeof HealthCheckStatus.DEGRADED;
  type SHUTTING_DOWN = typeof HealthCheckStatus.SHUTTING_DOWN;
}

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
