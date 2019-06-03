import { Module } from '@nestjs/common';
import {
  TerminusModule,
  TerminusModuleOptions,
  MicroserviceHealthIndicator,
  GRPCHealthIndicator,
} from '../../../../lib';

const getTerminusOptions = (
  grpc: GRPCHealthIndicator,
): TerminusModuleOptions => ({
  endpoints: [
    {
      url: '/health',
      healthIndicators: [
        async () =>
          grpc.checkService('hero_service', 'hero.health.v1', {
            timeout: 2000,
          }),
      ],
    },
  ],
});

@Module({
  imports: [
    TerminusModule.forRootAsync({
      inject: [GRPCHealthIndicator],
      useFactory: getTerminusOptions,
    }),
  ],
})
export class HealthModule {}
