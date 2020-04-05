import { Module } from '@nestjs/common';
import { GrpcOptions } from '@nestjs/microservices';
import {
  TerminusModule,
  TerminusModuleOptions,
  GRPCHealthIndicator,
} from '@nestjs/terminus';

const getTerminusOptions = (
  grpc: GRPCHealthIndicator,
): TerminusModuleOptions => ({
  endpoints: [
    {
      url: '/health',
      healthIndicators: [
        async () =>
          grpc.checkService<GrpcOptions>('hero_service', 'hero.health.v1', {
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
