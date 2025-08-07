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

export const TERMINUS_ENABLE_ENHANCED_SHUTDOWN =
  'TERMINUS_ENABLE_ENHANCED_SHUTDOWN';

export const TERMINUS_BEFORE_SHUTDOWN_DELAY = 'TERMINUS_BEFORE_SHUTDOWN_DELAY';

/**
 * Handles Graceful shutdown timeout useful to await
 * for some time before the application shuts down.
 */
@Injectable()
export class GracefulShutdownService implements BeforeApplicationShutdown {
  private isShuttingDown = false;

  constructor(
    @Inject(TERMINUS_LOGGER)
    private readonly logger: LoggerService,
    @Inject(TERMINUS_GRACEFUL_SHUTDOWN_TIMEOUT)
    private readonly gracefulShutdownTimeoutMs: number,
    @Inject(TERMINUS_ENABLE_ENHANCED_SHUTDOWN)
    private readonly enableEnhancedShutdown: boolean = false,
    @Inject(TERMINUS_BEFORE_SHUTDOWN_DELAY)
    private readonly beforeShutdownDelayMs: number = 15000,
  ) {
    if (this.logger instanceof ConsoleLogger) {
      this.logger.setContext(GracefulShutdownService.name);
    }
  }

  /**
   * Check if the application is currently shutting down
   * Used to mark readiness probe as unhealthy during shutdown
   */
  public isApplicationShuttingDown(): boolean {
    return this.isShuttingDown;
  }

  async beforeApplicationShutdown(signal: string) {
    this.logger.log(`Received termination signal ${signal || ''}`);

    if (signal === 'SIGTERM') {
      if (this.enableEnhancedShutdown) {
        await this.performEnhancedShutdown();
      } else {
        await this.performStandardGracefulShutdown();
      }
    }
  }

  private async performStandardGracefulShutdown() {
    this.logger.log(
      `Awaiting ${this.gracefulShutdownTimeoutMs}ms before shutdown`,
    );
    await sleep(this.gracefulShutdownTimeoutMs);
    this.logger.log(`Timeout reached, shutting down now`);
  }

  private async performEnhancedShutdown() {
    // Step 1: Mark application as shutting down (readiness probe will fail)
    this.isShuttingDown = true;
    this.logger.log(
      'Enhanced graceful shutdown initiated - marking readiness probe as unhealthy',
    );

    // Step 2: Wait for load balancer to stop routing traffic
    if (this.beforeShutdownDelayMs > 0) {
      this.logger.log(
        `Waiting ${this.beforeShutdownDelayMs}ms for load balancer to stop routing traffic`,
      );
      await sleep(this.beforeShutdownDelayMs);
    }

    // Step 3: Wait for remaining requests to complete
    if (this.gracefulShutdownTimeoutMs > 0) {
      this.logger.log(
        `Processing remaining requests for up to ${this.gracefulShutdownTimeoutMs}ms`,
      );
      await sleep(this.gracefulShutdownTimeoutMs);
    }

    this.logger.log(
      'Enhanced graceful shutdown complete, terminating application',
    );
  }
}
