import {
  Injectable,
  ServiceUnavailableException,
  Inject,
  ConsoleLogger,
  LoggerService,
} from '@nestjs/common';
import { ErrorLogger } from './error-logger/error-logger.interface';
import { ERROR_LOGGER } from './error-logger/error-logger.provider';
import { HealthCheckExecutor } from './health-check-executor.service';
import { type HealthCheckResult } from './health-check-result.interface';
import { type HealthIndicatorFunction } from '../health-indicator';
import { TERMINUS_LOGGER } from './logger/logger.provider';

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
    @Inject(TERMINUS_LOGGER)
    private readonly logger: LoggerService,
  ) {
    if (this.logger instanceof ConsoleLogger) {
      this.logger.setContext(HealthCheckService.name);
    }
  }

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

    if (result.status === 'error') {
      const msg = this.errorLogger.getErrorMessage(
        'Health Check has failed!',
        result.details,
      );
      this.logger.error(msg);
    }

    throw new ServiceUnavailableException(result);
  }
}
