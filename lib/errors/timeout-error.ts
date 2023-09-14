import { TIMEOUT_EXCEEDED } from './messages.constant';
import { HealthCheckError } from '../health-check/health-check.error';

/**
 * Gets thrown when the timeout of the health check exceeds
 * @publicApi
 */
export class TimeoutError extends HealthCheckError {
  /**
   * Initializes the error
   * @param {number} timeout The given timeout in ms
   * @param {any} cause The cause of the health check error
   *
   * @internal
   */
  constructor(timeout: number, cause: any) {
    super(TIMEOUT_EXCEEDED(timeout), cause);
  }
}
