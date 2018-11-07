import { HealthCheckError } from '@godaddy/terminus';

/**
 * Error which gets thrown when the connection
 * instance was not found in the application context
 */
export class ConnectionNotFoundError extends HealthCheckError {
  /**
   * Initializes the error
   * @param {unknown} cause The cause of the health check error
   */
  constructor(cause: unknown) {
    super('Connection provider not found in application context', cause);
  }
}
