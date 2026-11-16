import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { EmailQueueHealthIndicator } from './email-queue.health.js';
import { EmailQueueService } from './email-queue.service.js';

// The indicator lives next to the feature it checks and is exported for the
// health module.
@Module({
  imports: [TerminusModule],
  providers: [EmailQueueService, EmailQueueHealthIndicator],
  exports: [EmailQueueHealthIndicator],
})
export class EmailsModule {}
