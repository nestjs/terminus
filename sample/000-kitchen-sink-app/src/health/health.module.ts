import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TerminusModule } from '@nestjs/terminus';
import { CacheModule } from '../cache/cache.module.js';
import { EmailsModule } from '../emails/emails.module.js';
import { HealthController } from './health.controller.js';

@Module({
  imports: [
    TerminusModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        errorLogStyle: config.get('TERMINUS_ERROR_LOG_STYLE', 'pretty'),
        // A bit longer than the interval of the readiness probe, so that the
        // orchestrator stops the traffic before the app shuts down
        gracefulShutdownTimeoutMs: Number(
          config.get('TERMINUS_GRACEFUL_SHUTDOWN_TIMEOUT_MS', 0),
        ),
      }),
    }),
    EmailsModule,
    CacheModule,
  ],
  controllers: [HealthController],
})
export class HealthModule {}
