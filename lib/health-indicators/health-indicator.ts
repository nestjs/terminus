import { HealthIndicatorResult } from '..';

/**
 * Represents an abstract health indicator
 * with common functionalities
 *
 * @public
 */
export abstract class HealthIndicator {
  /**
   * Generates the health indicator result object
   * @param key The key which will be used as key for the result object
   * @param isHealthy Whether the health indicator is healthy
   * @param data Additional data which will get appended to the result object
   *
   * @example
   * class MyHealthIndicator extends HealthIndicator {
   *   public check(key: string) {
   *     // Replace with the actual check
   *     const isHealthy = true;
   *     // Returns { [key]: { status: 'up', message: 'Up and running' } }
   *     return super.getStatus(key, isHealthy, { message: 'Up and running' });
   *   }
   * }
   */
  protected getStatus(
    key: string,
    isHealthy: boolean,
    data?: { [key: string]: unknown },
  ): HealthIndicatorResult {
    return {
      [key]: {
        status: isHealthy ? 'up' : 'down',
        ...data,
      },
    };
  }
}
