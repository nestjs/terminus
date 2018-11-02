export type HealthIndicatorResult = {
  [key: string]: any;
};

export type HealthIndicatorFunction = () => Promise<HealthIndicatorResult>;

/**
 * Represents a health indicator of a health check
 */
export interface HealthIndicator {
  /**
   * If the health indicator is healthy
   *
   * @param {string} key The key of the health check which will be used in the result object
   * @param {any} [options] The options to configure the health indicator
   */
  isHealthy(key: string, options?: any): Promise<HealthIndicatorResult>;
}
