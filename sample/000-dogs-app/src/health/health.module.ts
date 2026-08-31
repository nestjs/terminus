import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { DogModule } from '../dog/dog.module.js';
import { HealthController } from './health.controller.js';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    TerminusModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        errorLogStyle: configService.get('TERMINUS_ERROR_LOG_STYLE'),
        logger: configService.get('TERMINUS_LOGGER') === 'true',
        gracefulShutdownTimeoutMs: parseInt(
          configService.get('TERMINUS_GRACEFUL_SHUTDOWN_TIMEOUT_MS', '0'),
          10,
        ),
      }),
      inject: [ConfigService],
      imports: [ConfigModule],
    }),
    DogModule,
  ],
  controllers: [HealthController],
})
export class HealthModule {}
