import { Injectable, type BeforeApplicationShutdown } from '@nestjs/common';
import {
  type HealthCheckResult,
  type HealthCheckStatus,
} from './health-check-result.interface';
import { type HealthCheckError } from '../health-check/health-check.error';
import {
  type HealthIndicatorFunction,
  type HealthIndicatorResult,
} from '../health-indicator';
import { isHealthCheckError } from '../utils';

/**
 * Takes care of the execution of health indicators.
 *
 * @description
 * The HealthCheckExecutor is standalone, so it can be used for
 * the legacy TerminusBootstrapService and the HealthCheckService.
 *
 * On top of that, the HealthCheckExecutor uses the `BeforeApplicationShutdown`
 * hook, therefore it must implement the `beforeApplicationShutdown`
 * method as public. We do not want to expose that
 * to the end-user.
 *
 * @internal
 */
@Injectable()
export class HealthCheckExecutor implements BeforeApplicationShutdown {
  private isShuttingDown = false;

  /**
   * Executes the given health indicators.
   * Implementation for v6 compatibility.
   *
   * @throws {Error} All errors which are not inherited by the `HealthCheckError`-class
   *
   * @returns the result of given health indicators
   * @param healthIndicators The health indicators which should get executed
   */
  async execute(
    healthIndicators: HealthIndicatorFunction[],
  ): Promise<HealthCheckResult> {
    const { results, errors } =
      await this.executeHealthIndicators(healthIndicators);

    return this.getResult(results, errors);
  }

  /**
   * @internal
   */
  beforeApplicationShutdown(): void {
    this.isShuttingDown = true;
  }

  private async executeHealthIndicators(
    healthIndicators: HealthIndicatorFunction[],
  ) {
    const results: HealthIndicatorResult[] = [];
    const errors: HealthIndicatorResult[] = [];

    const result = await Promise.allSettled(
      healthIndicators.map(async (h) => h()),
    );

    result.forEach((res) => {
      if (res.status === 'fulfilled') {
        Object.entries(res.value).forEach(([key, value]) => {
          if (value.status === 'up') {
            results.push({ [key]: value });
          } else if (value.status === 'down') {
            errors.push({ [key]: value });
          }
        });
      } else {
        const error = res.reason;
        // Is not an expected error. Throw further!
        if (!isHealthCheckError(error)) {
          throw error;
        }

        // eslint-disable-next-line deprecation/deprecation
        errors.push((error as HealthCheckError).causes);
      }
    });

    return { results, errors };
  }

  private getSummary(results: HealthIndicatorResult[]): HealthIndicatorResult {
    return results.reduce(
      (previous: any, current: any) => Object.assign(previous, current),
      {},
    );
  }

  private getResult(
    results: HealthIndicatorResult[],
    errors: HealthIndicatorResult[],
  ): HealthCheckResult {
    const infoErrorCombined = results.concat(errors);

    const info = this.getSummary(results);
    const error = this.getSummary(errors);
    const details = this.getSummary(infoErrorCombined);

    let status: HealthCheckStatus = 'ok';
    status = errors.length > 0 ? 'error' : status;
    status = this.isShuttingDown ? 'shutting_down' : status;

    return {
      status,
      info,
      error,
      details,
    };
  }
}
