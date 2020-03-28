import {
  Injectable,
  ServiceUnavailableException,
  Logger,
} from '@nestjs/common';
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

  private readonly logger = new Logger(HealthCheckService.name, true);

  /**
   * Logs an error message of terminus
   * @param message The log message
   * @param error The error which was thrown
   */
  private logError(message: string, causes: any) {
    message = `${message} ${JSON.stringify(causes)}`;
    this.logger.error(message);
  }

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
    const result = await this.healthCheckExecutor.execute(healthIndicators);
    if (result.status === 'ok') {
      return result;
    }
    this.logError('Health Check has failed!', result.error);
    throw new ServiceUnavailableException(result);
  }
}
