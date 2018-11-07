import { HealthIndicatorResult } from '../..';

/**
 * Represents an abstract health indicator
 * with common functionalities
 */
export abstract class HealthIndicator {
  /**
   * Generates the health indicator result object
   * @param key The key which will be used as key for the result object
   * @param isHealthy Whether the health indicator is healthy
   * @param options Additional options which will get appended to the result object
   */
  protected getStatus(
    key: string,
    isHealthy: boolean,
    options?: { [key: string]: unknown },
  ): HealthIndicatorResult {
    return {
      [key]: {
        status: isHealthy ? 'up' : 'down',
        ...options,
      },
    };
  }
}
