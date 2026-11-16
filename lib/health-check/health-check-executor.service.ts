import { setTimeout } from 'node:timers/promises';
import {
  type BeforeApplicationShutdown,
  Inject,
  Injectable,
  type LoggerService,
  ShutdownSignal,
} from '@nestjs/common';
import {
  type HealthCheckResult,
  HealthCheckStatus,
} from './health-check-result.interface.js';
import {
  type InferHealthIndicatorResults,
  type HealthIndicatorFunction,
  type HealthIndicatorResult,
} from '../health-indicator/index.js';
import { HealthIndicatorStatus } from '../health-indicator/service/health-indicator-result.interface.js';
import { HealthCheckAttempt } from '../health-indicator/service/health-check-attempt.js';
import { type TerminusModuleOptions } from '../terminus-options.interface.js';
import {
  TERMINUS_LOGGER,
  TERMINUS_MODULE_OPTIONS,
} from '../terminus.constants.js';

/**
 * This class is responsible for executing the health indicators and returning the result.
 *
 * @internal
 */
@Injectable()
export class HealthCheckExecutor implements BeforeApplicationShutdown {
  private isShuttingDown = false;

  constructor(
    @Inject(TERMINUS_LOGGER)
    private readonly logger: LoggerService,
    @Inject(TERMINUS_MODULE_OPTIONS)
    private readonly options: TerminusModuleOptions,
  ) {}

  /**
   * Executes the given health indicators.
   * Implementation for v6 compatibility.
   *
   * @throws {Error} Any error thrown by a health indicator
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
  async beforeApplicationShutdown(signal?: string) {
    this.isShuttingDown = true;

    const timeoutMs = this.options.gracefulShutdownTimeoutMs ?? 0;
    if (timeoutMs <= 0) {
      return;
    }

    this.logger.log(`Received termination signal ${signal || ''}`);

    if (signal === ShutdownSignal.SIGTERM) {
      this.logger.log(`Awaiting ${timeoutMs}ms before shutdown`);
      await setTimeout(timeoutMs);
      this.logger.log(`Timeout reached, shutting down now`);
    }
  }

  private async executeHealthIndicators(
    healthIndicators: HealthIndicatorFunction[],
  ) {
    const results: HealthIndicatorResult[] = [];
    const errors: HealthIndicatorResult[] = [];

    const result = await Promise.allSettled(
      healthIndicators.map(async (h) =>
        h instanceof HealthCheckAttempt ? h : h(),
      ),
    );

    result.forEach((res) => {
      if (res.status === 'fulfilled') {
        Object.entries(res.value).forEach(([key, value]) => {
          if (
            value.status === HealthIndicatorStatus.UP ||
            value.status === HealthIndicatorStatus.DEGRADED
          ) {
            results.push({ [key]: value });
          } else if (value.status === HealthIndicatorStatus.DOWN) {
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

  private getStatus(
    results: HealthIndicatorResult[],
    errors: HealthIndicatorResult[],
  ): HealthCheckStatus {
    if (this.isShuttingDown) {
      return HealthCheckStatus.SHUTTING_DOWN;
    }

    if (errors.length > 0) {
      return HealthCheckStatus.ERROR;
    }

    const hasDegraded = results.some((result) =>
      Object.values(result).some(
        (value) => value.status === HealthIndicatorStatus.DEGRADED,
      ),
    );

    if (hasDegraded) {
      return HealthCheckStatus.DEGRADED;
    }

    return HealthCheckStatus.OK;
  }

  private getResult(
    results: HealthIndicatorResult[],
    errors: HealthIndicatorResult[],
  ): HealthCheckResult {
    return {
      status: this.getStatus(results, errors),
      info: this.getSummary(results),
      error: this.getSummary(errors),
      details: this.getSummary(results.concat(errors)),
    };
  }
}
