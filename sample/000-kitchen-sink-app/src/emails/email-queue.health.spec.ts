import { HealthIndicatorService } from '@nestjs/terminus';
import { EmailQueueHealthIndicator } from './email-queue.health.js';
import { type EmailQueueService } from './email-queue.service.js';

// The real `HealthIndicatorService` needs no setup, so only the queue is
// replaced.
function createIndicator(getWaitingCount: () => Promise<number>) {
  return new EmailQueueHealthIndicator(new HealthIndicatorService(), {
    getWaitingCount,
  } as EmailQueueService);
}

describe('EmailQueueHealthIndicator', () => {
  it('is up with the number of waiting emails', async () => {
    const indicator = createIndicator(async () => 3);

    await expect(indicator.isHealthy('email_queue')).resolves.toEqual({
      email_queue: {
        status: 'up',
        waiting: 3,
        responseTime: expect.any(Number),
      },
    });
  });

  it('is down with the error message if the queue fails', async () => {
    const indicator = createIndicator(async () => {
      throw new Error('queue unreachable');
    });

    await expect(indicator.isHealthy('email_queue')).resolves.toEqual({
      email_queue: {
        status: 'down',
        message: 'queue unreachable',
        responseTime: expect.any(Number),
      },
    });
  });
});
