import { Module } from '@nestjs/common';
import {
  TerminusModule,
  TerminusModuleOptions,
  MicroserviceHealthIndicator,
} from '../../../lib';
import { Transport } from '@nestjs/microservices';

const getTerminusOptions = (
  microservice: MicroserviceHealthIndicator,
): TerminusModuleOptions => ({
  endpoints: [
    {
      url: '/health',
      healthIndicators: [
        async () =>
          microservice.pingCheck('tcp', {
            transport: Transport.TCP,
            options: { host: 'localhost', port: 8889 },
          }),
        async () =>
          microservice.pingCheck('redis', {
            transport: Transport.REDIS,
            options: {
              url: 'redis://localhost:6379',
            },
          }),
      ],
    },
  ],
});

@Module({
  imports: [
    TerminusModule.forRootAsync({
      inject: [MicroserviceHealthIndicator],
      useFactory: getTerminusOptions,
    }),
  ],
})
export class HealthModule {}
