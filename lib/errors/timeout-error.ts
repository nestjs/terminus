import { HealthCheckError } from '@godaddy/terminus';

/**
 * Gets thrown when the timeout of the
 * typeorm health check exceeds
 */
export class TimeoutError extends HealthCheckError {
  /**
   * Initializes the error
   * @param {number} timeout The given timeout in ms
   * @param {unknown} cause The cause of the health check error
   */
  constructor(timeout: number, cause: unknown) {
    super(`timeout of ${timeout}ms exceeded`, cause);
  }
}
