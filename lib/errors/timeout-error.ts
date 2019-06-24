import { HealthCheckError } from '@godaddy/terminus';
import { TIMEOUT_EXCEEDED } from './messages.constant';

/**
 * Gets thrown when the timeout of the health check exceeds
 * @publicApi
 */
export class TimeoutError extends HealthCheckError {
  /**
   * Initializes the error
   * @param {number} timeout The given timeout in ms
   * @param {any} cause The cause of the health check error
   */
  constructor(timeout: number, cause: any) {
    super(TIMEOUT_EXCEEDED(timeout), cause);
  }
}
