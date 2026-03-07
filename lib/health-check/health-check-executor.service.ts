import { Injectable, type BeforeApplicationShutdown } from '@nestjs/common';
import {
  type HealthCheckResult,
  type HealthCheckStatus,
} from './health-check-result.interface';
import {
  type InferHealthIndicatorResults,
  type HealthIndicatorFunction,
  type HealthIndicatorResult,
} from '../health-indicator';

/**
 * This class is responsible for executing the health indicators and returning the result.
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
  async execute<const TFns extends HealthIndicatorFunction[]>(
    healthIndicators: TFns,
  ) {
    const { results, errors } =
      await this.executeHealthIndicators(healthIndicators);

    return this.getResult(results, errors) as HealthCheckResult<
      InferHealthIndicatorResults<TFns>
    >;
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
        throw error;
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
