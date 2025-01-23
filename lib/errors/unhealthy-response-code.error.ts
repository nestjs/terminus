/* eslint-disable deprecation/deprecation */
import { UNHEALTHY_RESPONSE_CODE } from './messages.constant';
import { HealthCheckError } from '../health-check/health-check.error';

/**
 * Error which gets thrown when the terminus client receives
 * an unhealthy response code from the server.
 * @publicApi
 *
 * @deprecated
 * This class has been deprecated and will be removed in the next major release.
 * Instead utilise the `HealthIndicatorService` to indicate the health of your health indicator.
 */
export class UnhealthyResponseCodeError extends HealthCheckError {
  /**
   * Initializes the error
   *
   * @param {string | number} responseCode The response code
   * @param {any} cause The cause of the health check error
   *
   * @internal
   */
  constructor(responseCode: string, cause: any) {
    super(UNHEALTHY_RESPONSE_CODE(responseCode), cause);
  }
}
