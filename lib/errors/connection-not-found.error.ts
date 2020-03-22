import { HealthCheckError } from '../';
import { CONNECTION_NOT_FOUND } from './messages.constant';

/**
 * Error which gets thrown when the connection
 * instance was not found in the application context
 * @publicApi
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
