import { Injectable } from '@nestjs/common';
import { HealthIndicatorService } from '@nestjs/terminus';
import { EmailQueueService } from './email-queue.service.js';

/**
 * A custom indicator built with `attempt()`: `up` if the operation resolves,
 * `down` if it throws or takes too long.
 */
@Injectable()
export class EmailQueueHealthIndicator {
  constructor(
    private readonly healthIndicatorService: HealthIndicatorService,
    private readonly emailQueue: EmailQueueService,
  ) {}

  isHealthy<const TKey extends string>(key: TKey) {
    return this.healthIndicatorService
      .check(key)
      .attempt(() => this.emailQueue.getWaitingCount())
      .withSuccessData((waiting) => ({ waiting }))
      .withTimeout('1s');
  }
}
