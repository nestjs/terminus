import { parse } from 'node:path';
import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DiskHealthIndicator,
  FetchHealthIndicator,
  HealthCheck,
  HealthCheckService,
} from '@nestjs/terminus';
import { CacheHealthIndicator } from '../cache/cache.health.js';
import { EmailQueueHealthIndicator } from '../emails/email-queue.health.js';

@Controller('health')
export class HealthController {
  constructor(
    private readonly config: ConfigService,
    private readonly health: HealthCheckService,
    private readonly http: FetchHealthIndicator,
    private readonly disk: DiskHealthIndicator,
    private readonly emailQueue: EmailQueueHealthIndicator,
    private readonly cache: CacheHealthIndicator,
  ) {}

  /**
   * Liveness: is the process broken? The orchestrator restarts the app when
   * this fails, so it checks no dependencies. An answer is enough.
   */
  @Get('live')
  @HealthCheck()
  live() {
    return this.health.check([]);
  }

  /**
   * Readiness: can the app serve requests right now? The orchestrator stops
   * the traffic while this fails.
   */
  @Get('ready')
  @HealthCheck()
  ready() {
    return this.health.check([
      // A dependency the app can't work without. Slow is degraded, too slow
      // is down. The owner is next to the error when it fails.
      () =>
        this.http
          .pingCheck(
            'payments',
            this.config.get('PAYMENTS_URL', 'https://docs.nestjs.com'),
          )
          .withData({ owner: 'team-payments' })
          .degradedAfter('300ms')
          .withTimeout('2s'),
      // Emails are sent later when the queue is down: the app keeps serving
      () => this.emailQueue.isHealthy('email_queue').degradedOnFailure(),
      () => this.cache.isHealthy('cache'),
      // The disk fills up slowly: look at most every 30 seconds
      () =>
        this.disk
          .checkStorage('storage', {
            path: parse(process.cwd()).root,
            thresholdPercent: Number(
              this.config.get('STORAGE_THRESHOLD_PERCENT', 0.9),
            ),
          })
          .cacheFor('30s'),
    ]);
  }
}
