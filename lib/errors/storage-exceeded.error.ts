import { HealthCheckError } from '../health-check/health-check.error';
import { STORAGE_EXCEEDED } from './messages.constant';

/**
 * Error which gets thrown when the given storage threshold
 * has exceeded.
 * @publicApi
 */
export class StorageExceededError extends HealthCheckError {
  /**
   * Initializes the error
   *
   * @param {string} keyword The keyword (heap, rss, disk e.g.)
   * @param {any} cause The cause of the health check error
   *
   * @internal
   */
  constructor(keyword: string, cause: any) {
    super(STORAGE_EXCEEDED(keyword), cause);
  }
}
