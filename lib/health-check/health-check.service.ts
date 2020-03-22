import { Injectable } from '@nestjs/common';
import { HealthIndicatorFunction } from '../health-indicator';
import { HealthCheckExecutor } from './health-check-executor.service';
import { HealthCheckResult } from './health-check-result.interface';

/**
 * Handles Health Checks which can be used in
 * Controllers.
 */
@Injectable()
export class HealthCheckService {
  constructor(private healthCheckExecutor: HealthCheckExecutor) {}

  /**
   * Checks the given health indicators
   *
   * ```typescript
   *
   * healthCheckService.check([
   *   () => this.dns.pingCheck('google', 'https://google.com'),
   * ]);
   *
   *
   * ```
   * @param healthIndicators The health indicators which should be checked
   */
  async check(
    healthIndicators: HealthIndicatorFunction[],
  ): Promise<HealthCheckResult> {
    return await this.healthCheckExecutor.execute(healthIndicators);
  }
}
