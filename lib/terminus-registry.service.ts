import { Injectable } from '@nestjs/common';
import {
  HealthIndicator,
  HealthCheckResult,
  HealthCheckFunction,
} from './interfaces';

@Injectable()
export class TerminusRegistry {
  private healthFunctions: HealthCheckFunction[] = new Array<
    HealthCheckFunction
  >();

  constructor() {}

  /**
   * Registers the given health indicator
   * @param healthIndicator The function which determines the health of a certain functionality
   */
  public register(healthIndicator: HealthIndicator | HealthCheckFunction) {
    let healthFunction: HealthCheckFunction;
    if (typeof healthIndicator !== 'function') {
      healthFunction = (healthIndicator as HealthIndicator).isHealthy;
    } else {
      healthFunction = healthIndicator;
    }
    this.healthFunctions.push(healthFunction);
  }

  /**
   * Returns the registered health functionsk
   */
  public getHealthFunctions(): HealthCheckFunction[] {
    return this.healthFunctions;
  }
}
