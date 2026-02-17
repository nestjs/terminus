import {
  Injectable,
  ServiceUnavailableException,
  Inject,
  ConsoleLogger,
  LoggerService,
  InternalServerErrorException,
} from '@nestjs/common';
import { ErrorLogger } from './error-logger/error-logger.interface';
import { ERROR_LOGGER } from './error-logger/error-logger.provider';
import { HealthCheckExecutor } from './health-check-executor.service';
import { type HealthIndicatorFunction } from '../health-indicator';
import { TERMINUS_LOGGER } from '../terminus.constants';

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
  async check<const TFns extends HealthIndicatorFunction[]>(
    healthIndicators: TFns,
  ) {
    const result = await this.healthCheckExecutor.execute(healthIndicators);

    switch (result.status) {
      case 'ok':
        return result;

      case 'error':
        const msg = this.errorLogger.getErrorMessage(
          'Health Check has failed!',
          result.details,
        );
        this.logger.error(msg);
        throw new ServiceUnavailableException(result);

      case 'shutting_down':
        throw new ServiceUnavailableException(result);

      default:
        // Ensure that we have exhaustively checked all cases
        // eslint-disable-next-line unused-imports/no-unused-vars
        const exhaustiveCheck: never = result.status;
        throw new InternalServerErrorException();
    }
  }
}
