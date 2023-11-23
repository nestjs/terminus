import {
  type BeforeApplicationShutdown,
  ConsoleLogger,
  Inject,
  Injectable,
  LoggerService,
} from '@nestjs/common';
import { TERMINUS_LOGGER } from '../health-check/logger/logger.provider';
import { sleep } from '../utils';

export const TERMINUS_GRACEFUL_SHUTDOWN_TIMEOUT =
  'TERMINUS_GRACEFUL_SHUTDOWN_TIMEOUT';

/**
 * Handles Graceful shutdown timeout useful to await
 * for some time before the application shuts down.
 */
@Injectable()
export class GracefulShutdownService
  implements BeforeApplicationShutdown
{
  constructor(
    @Inject(TERMINUS_LOGGER)
    private readonly logger: LoggerService,
    @Inject(TERMINUS_GRACEFUL_SHUTDOWN_TIMEOUT)
    private readonly gracefulShutdownTimeoutMs: number,
  ) {
    if (this.logger instanceof ConsoleLogger) {
      this.logger.setContext(GracefulShutdownTimeoutService.name);
    }
  }

  async beforeApplicationShutdown(signal: string) {
    this.logger.log(`Received termination signal ${signal}`);

    if (signal === 'SIGTERM') {
      this.logger.log(
        `Awaiting ${this.gracefulShutdownTimeoutMs}ms before shutdown`,
      );
      await sleep(this.gracefulShutdownTimeoutMs);
      this.logger.log(`Timeout reached, shutting down now`);
    }
  }
}
