/* eslint-disable deprecation/deprecation */
import { STORAGE_EXCEEDED } from './messages.constant';
import { HealthCheckError } from '../health-check/health-check.error';

/**
 * Error which gets thrown when the given storage threshold
 * has exceeded.
 * @publicApi
 *
 * @deprecated
 * This class has been deprecated and will be removed in the next major release.
 * Instead utilise the `HealthIndicatorService` to indicate the health of your health indicator.
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
