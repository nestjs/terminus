/**
 * @publicApi
 */
export type HealthIndicatorStatus = 'up' | 'down';

/**
 * The result object of a health indicator
 * @publicApi
 */
export type HealthIndicatorResult = {
  /**
   * The key of the health indicator which should be uniqe
   */
  [key: string]: {
    /**
     * The status if the given health indicator was successful or not
     */
    status: HealthIndicatorStatus;
    /**
     * Optional settings of the health indicator result
     */
    [optionalKeys: string]: any;
  };
};
