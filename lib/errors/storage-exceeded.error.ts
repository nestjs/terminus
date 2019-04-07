import { HealthCheckError } from '@godaddy/terminus';
import { STORAGE_EXCEEDED } from './messages.constant';

/**
 * Error which gets thrown when the given storage threshold
 * has exceeded.
 */
export class StorageExceededError extends HealthCheckError {
  /**
   * Initializes the error
   *
   * @param {string} keyword The keyword (heap, rss, disk e.g.)
   * @param {unknown} cause The cause of the health check error
   */
  constructor(keyword: string, cause: unknown) {
    super(STORAGE_EXCEEDED(keyword), cause);
  }
}
