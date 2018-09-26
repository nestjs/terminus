import { Injectable } from '@nestjs/common';
import {
  HealthIndicator,
  HealthCheckResult,
  HealthCheckFunction,
} from './interfaces';

@Injectable()
export class TerminusRegistry {
  private healthIndicators: HealthIndicator[] = new Array<HealthIndicator>();

  constructor() {}

  /**
   * Registers the given health indicator
   * @param healthIndicator The function which determines the health of a certain functionality
   */
  public register(healthIndicator: HealthIndicator) {
    this.healthIndicators.push(healthIndicator);
  }

  /**
   * Returns the registered health functionsk
   */
  public getHealthIndicators(): HealthIndicator[] {
    return this.healthIndicators;
  }
}
