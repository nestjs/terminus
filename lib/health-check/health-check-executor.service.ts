import { Injectable } from '@nestjs/common';
import { HealthIndicatorFunction } from '../health-indicator';
import { HealthCheckError } from '@godaddy/terminus';
import { HealthCheckResult } from './health-check-result.interface';

/**
 * Takes care of the execution of health indicators
 * @internal
 */
@Injectable()
export class HealthCheckExecutor {
  /**
   * Executes the given health indicators.
   *
   * @throws {Error} All errors which are not inherited by the `HealthCheckError`-class
   *
   * @returns the result of given health indicators
   * @param healthIndicators The health indicators which should get executed
   */
  async execute(
    healthIndicators: HealthIndicatorFunction[],
  ): Promise<HealthCheckResult> {
    const results: any[] = [];
    const errors: any[] = [];
    await Promise.all(
      healthIndicators
        // Register all promises
        .map(healthIndicator => healthIndicator())
        .map((p: Promise<any>) =>
          p.catch((error: any) => {
            // Is not an expected error. Throw further!
            if (!error.causes) throw error;
            // Is a expected health check error
            errors.push((error as HealthCheckError).causes);
          }),
        )
        .map((p: Promise<any>) =>
          p.then((result: any) => result && results.push(result)),
        ),
    );

    const info: HealthCheckResult = (results || [])
      .concat(errors || [])
      .reduce(
        (previous: Object, current: Object) => Object.assign(previous, current),
        {},
      );

    if (errors.length) {
      throw new HealthCheckError('Healthcheck failed', info);
    } else {
      return info;
    }
  }
}
