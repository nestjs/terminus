import {
  Inject,
  Injectable,
  Optional,
  type BeforeApplicationShutdown,
} from '@nestjs/common';
import { type HealthCheckError } from '../health-check/health-check.error';
import {
  type HealthIndicatorFunction,
  type HealthIndicatorResult,
} from '../health-indicator';
import { isHealthCheckError } from '../utils';
import {
  type HealthCheckResult,
  type HealthCheckStatus,
} from './health-check-result.interface';
import { TERMINUS_FAIL_READINESS_ON_SHUTDOWN } from './shutdown.constants';

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

  constructor(
    @Optional()
    @Inject(TERMINUS_FAIL_READINESS_ON_SHUTDOWN)
    private readonly failReadinessOnShutdown?: boolean,
  ) {}

  /**
   * Executes the given health indicators.
   *
   * @throws {Error} All errors which are not inherited by the `HealthCheckError`-class
   */
  async execute(
    healthIndicators: HealthIndicatorFunction[],
  ): Promise<HealthCheckResult> {
    const { results, errors } =
      await this.executeHealthIndicators(healthIndicators);
    return this.getResult(results, errors);
  }

  /** @internal */
  public beforeApplicationShutdown(): void {
    this.isShuttingDown = true;
  }

  private async executeHealthIndicators(
    healthIndicators: HealthIndicatorFunction[],
  ): Promise<{
    results: HealthIndicatorResult[];
    errors: HealthIndicatorResult[];
  }> {
    const results: HealthIndicatorResult[] = [];
    const errors: HealthIndicatorResult[] = [];

    // Important: wrap each call so sync throws become rejections captured by allSettled
    const settled = await Promise.allSettled(
      healthIndicators.map(async (fn) => await fn()),
    );

    for (const res of settled) {
      if (res.status === 'fulfilled') {
        const value = res.value as HealthIndicatorResult;

        // If any entry in the fulfilled result is 'down', treat it as an error bucket
        if (this.isDown(value)) {
          errors.push(value);
        } else {
          results.push(value);
        }
      } else {
        const err = res.reason;

        // If it isn't a typed HealthCheckError, rethrow (test suite expects this behavior)
        if (!isHealthCheckError(err)) {
          throw err;
        }

        // HealthCheckError carries a "causes" object in the same shape as a result
        errors.push((err as HealthCheckError).causes);
      }
    }

    return { results, errors };
  }

  private getSummary(results: HealthIndicatorResult[]): HealthIndicatorResult {
    return results.reduce(
      (previous: Record<string, any>, current: Record<string, any>) =>
        Object.assign(previous, current),
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

    // Status precedence:
    // 1) If shutting down AND failReadinessOnShutdown => 'error' (HTTP 503)
    // 2) Else if any errors present => 'error'
    // 3) Else if shutting down => 'shutting_down'
    // 4) Else 'ok'
    let status: HealthCheckStatus = 'ok';

    if (this.isShuttingDown && this.failReadinessOnShutdown) {
      status = 'error';
    } else if (errors.length > 0) {
      status = 'error';
    } else if (this.isShuttingDown) {
      // legacy behavior kept for back-compat when the flag is off
      status = 'shutting_down' as HealthCheckStatus;
    }

    return {
      status,
      info,
      error,
      details,
    };
  }

  private isDown(result: HealthIndicatorResult): boolean {
    // result shape: { indicatorName: { status: 'up' | 'down', ... }, ... }
    return Object.values(result).some(
      (entry: any) => entry?.status && entry.status !== 'up',
    );
  }
}
