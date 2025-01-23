/* eslint-disable deprecation/deprecation */
import { CONNECTION_NOT_FOUND } from './messages.constant';
import { HealthCheckError } from '../health-check/health-check.error';

/**
 * Error which gets thrown when the connection
 * instance was not found in the application context
 * @publicApi
 *
 * @deprecated
 * This class has been deprecated and will be removed in the next major release.
 * Instead utilise the `HealthIndicatorService` to indicate the health of your health indicator.
 *
 */
export class ConnectionNotFoundError extends HealthCheckError {
  /**
   * Initializes the error
   * @param {any} cause The cause of the health check error
   *
   * @internal
   */
  constructor(cause: any) {
    super(CONNECTION_NOT_FOUND, cause);
  }
}
