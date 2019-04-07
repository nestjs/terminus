import { HealthCheckError } from '@godaddy/terminus';
import { CONNECTION_NOT_FOUND } from './messages.constant';

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
    super(CONNECTION_NOT_FOUND, cause);
  }
}
