/**
 * The result object of a health indicator
 */
export type HealthIndicatorResult = {
  /**
   * The key of the health indicator which should be uniqe
   */
  [key: string]: {
    /**
     * The status if the given health indicator was successful or not
     */
    status: string;
    /**
     * Optional settings of the health indicator result
     */
    [optionalKeys: string]: any;
  };
};

/**
 * A health indicator function for a health check
 */
export type HealthIndicatorFunction = () => Promise<HealthIndicatorResult>;
