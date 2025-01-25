import { type HealthIndicatorResult } from './';

/**
 * A health indicator function for a health check
 *
 * @publicApi
 */
export type HealthIndicatorFunction = () =>
  | PromiseLike<HealthIndicatorResult>
  | HealthIndicatorResult;

/**
 * @deprecated
 * **This class has been deprecated and will be removed in the next major release.**
 * Instead utilise the `HealthIndicatorService` to indicate the health of your health indicator.
 *
 * @see {@link https://docs.nestjs.com/migration-guide#terminus-module|Migration Guide}
 *
 * @description
 * Represents an abstract health indicator
 * with common functionalities
 *
 * A custom HealthIndicator should inherit the `HealthIndicator` class.
 *
 * @example
 * ```typescript
 * class MyHealthIndicator extends HealthIndicator {
 *   public check(key: string) {
 *     // Replace with the actual check
 *     const isHealthy = true;
 *     // Returns { [key]: { status: 'up', message: 'Up and running' } }
 *     return super.getStatus(key, isHealthy, { message: 'Up and running' });
 *   }
 * }
 * ```
 * @publicApi
 */
export abstract class HealthIndicator {
  /**
   * Generates the health indicator result object
   * @param key The key which will be used as key for the result object
   * @param isHealthy Whether the health indicator is healthy
   * @param data Additional data which will get appended to the result object
   */
  protected getStatus(
    key: string,
    isHealthy: boolean,
    data?: { [key: string]: any },
  ): HealthIndicatorResult {
    return {
      [key]: {
        status: isHealthy ? 'up' : 'down',
        ...data,
      },
    };
  }
}
