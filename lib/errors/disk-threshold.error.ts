import { HealthCheckError } from '@godaddy/terminus';
import { DISK_STORAGE_EXCEEDED } from './messages.constant';

/**
 * Error which gets thrown when the given disk threshold
 * has exceeded.
 */
export class DiskStorageExceededError extends HealthCheckError {
  /**
   * Initializes the error
   * @param {unknown} cause The cause of the health check error
   */
  constructor(cause: unknown) {
    super(DISK_STORAGE_EXCEEDED, cause);
  }
}
