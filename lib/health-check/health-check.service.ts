import {
  Injectable,
  ServiceUnavailableException,
  Logger,
  Inject,
} from '@nestjs/common';
import { HealthIndicatorFunction } from '../health-indicator';
import { ErrorLogger } from './error-logger/error-logger.interface';
import { ERROR_LOGGER } from './error-logger/error-logger.provider';
import { HealthCheckExecutor } from './health-check-executor.service';
import { HealthCheckResult } from './health-check-result.interface';

/**
 * Handles Health Checks which can be used in
 * Controllers.
 */
@Injectable()
export class HealthCheckService {
  constructor(
    private readonly healthCheckExecutor: HealthCheckExecutor,
    @Inject(ERROR_LOGGER)
    private readonly errorLogger: ErrorLogger,
  ) {}

  private readonly logger = new Logger(HealthCheckService.name);

  /**
   * Checks the given health indicators
   *
   * ```typescript
   *
   * healthCheckService.check([
   *   () => this.http.pingCheck('google', 'https://google.com'),
   * ]);
   *
   *
   * ```
   * @param healthIndicators The health indicators which should be checked
   */
  async check(
    healthIndicators: HealthIndicatorFunction[],
  ): Promise<HealthCheckResult> {
    const result = await this.healthCheckExecutor.execute(healthIndicators);
    if (result.status === 'ok') {
      return result;
    }

    if (result.error) {
      const msg = this.errorLogger.getErrorMessage(
        'Health Check has failed!',
        result.details,
      );
      this.logger.error(msg);
    }

    throw new ServiceUnavailableException(result);
  }
}
