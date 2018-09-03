import { Module, Injectable } from '@nestjs/common';
import { TerminusModule } from '../../../lib/terminus.module';
import { TerminusOptions } from '../../../lib/interfaces/terminus-options';

@Injectable()
export class HealthService {
  public async checkHealth() {
    return true;
  }
}

@Module({
  providers: [HealthService],
  exports: [HealthService],
})
export class HealthModule {}

@Module({
  imports: [
    TerminusModule.forRootAsync({
      imports: [HealthModule],
      useFactory: async (
        healthService: HealthService,
      ): Promise<TerminusOptions> => ({
        async onShutdown() {
          console.log('Shutting down');
        },
        healthChecks: {
          '/health': healthService.checkHealth,
        },
        timeout: 1500,
      }),
      inject: [HealthService],
    }),
  ],
})
export class ApplicationModule {}
