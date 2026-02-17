import {
  type BeforeApplicationShutdown,
  ConsoleLogger,
  Inject,
  Injectable,
  LoggerService,
} from '@nestjs/common';
import { TERMINUS_LOGGER } from 'lib/terminus.constants';
import { sleep } from '../utils';
import { TERMINUS_MODULE_OPTIONS } from 'lib/terminus.constants';
import { TerminusModuleOptions } from 'lib';

/**
 * Handles Graceful shutdown timeout useful to await
 * for some time before the application shuts down.
 */
@Injectable()
export class GracefulShutdownService implements BeforeApplicationShutdown {
  constructor(
    @Inject(TERMINUS_LOGGER)
    private readonly logger: LoggerService,
    @Inject(TERMINUS_MODULE_OPTIONS)
    private readonly options: TerminusModuleOptions,
  ) {
    if (this.logger instanceof ConsoleLogger) {
      this.logger.setContext(GracefulShutdownService.name);
    }
  }

  private get isEnabled() {
    return (this.options.gracefulShutdownTimeoutMs ?? 0) > 0;
  }

  async beforeApplicationShutdown(signal: string) {
    if (!this.isEnabled) {
      return;
    }

    this.logger.log(`Received termination signal ${signal || ''}`);

    if (signal === 'SIGTERM') {
      this.logger.log(
        `Awaiting ${this.options.gracefulShutdownTimeoutMs}ms before shutdown`,
      );
      await sleep(this.options.gracefulShutdownTimeoutMs!);
      this.logger.log(`Timeout reached, shutting down now`);
    }
  }
}
