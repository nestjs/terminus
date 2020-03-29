import { Injectable, BeforeApplicationShutdown } from '@nestjs/common';
import {
  HealthIndicatorFunction,
  HealthIndicatorResult,
} from '../health-indicator';
import { HealthCheckError } from '../health-check/health-check.error';
import {
  HealthCheckResult,
  HealthCheckStatus,
} from './health-check-result.interface';

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

  private async executeHealthIndicators(
    healthIndicators: HealthIndicatorFunction[],
  ) {
    const results: any[] = [];
    const errors: any[] = [];
    for (const healthIndicator of healthIndicators) {
      try {
        const result = await healthIndicator();
        result && results.push(result);
      } catch (error) {
        // Is not an expected error. Throw further!
        if (!error.causes) throw error;
        // Is a expected health check error
        errors.push((error as HealthCheckError).causes);
      }
    }

    return { results, errors };
  }

  private getSummary(results: any[]): HealthIndicatorResult {
    return results.reduce(
      (previous: any, current: any) => Object.assign(previous, current),
      {},
    );
  }

  private getResult(results: any[], errors: any[]): HealthCheckResult {
    const infoErrorCombined = (results || []).concat(errors || []);

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

  /**
   * Executes the given health indicators.
   * Implementation for v6 compatibility.
   *
   * @throws {Error} All errors which are not inherited by the `HealthCheckError`-class
   *
   * @deprecated
   * @returns the result of given health indicators
   * @param healthIndicators The health indicators which should get executed
   */
  async executeDeprecated(
    healthIndicators: HealthIndicatorFunction[],
  ): Promise<HealthIndicatorResult> {
    const { results, errors } = await this.executeHealthIndicators(
      healthIndicators,
    );
    const infoErrorCombined = (results || []).concat(errors || []);

    const details = this.getSummary(infoErrorCombined);

    if (errors.length) {
      throw new HealthCheckError('Healthcheck failed', details);
    } else {
      return details;
    }
  }

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
    const { results, errors } = await this.executeHealthIndicators(
      healthIndicators,
    );

    return this.getResult(results, errors);
  }

  /**
   * @internal
   */
  beforeApplicationShutdown() {
    this.isShuttingDown = true;
  }
}
