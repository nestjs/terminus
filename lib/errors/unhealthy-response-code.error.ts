import { HealthCheckError } from '@godaddy/terminus';
import { UNHEALTHY_RESPONSE_CODE } from './messages.constant';

/**
 * Error which gets thrown when the terminus client receives
 * an unhealthy response code from the server.
 * @publicApi
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
