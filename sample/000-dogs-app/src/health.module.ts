import { Module } from '@nestjs/common';
import {
  DNSHealthIndicator,
  TerminusModule,
  TerminusModuleOptions,
} from '../../../lib';
import { CatHealthIndicator } from './cat/cat.health';
import { CatModule } from './cat/cat.module';

import { DogHealthIndicator } from './dog/dog.health';

import { DogModule } from './dog/dog.module';

const getTerminusOptions = (
  dogHealthIndicator: DogHealthIndicator,
  catHealthIndicator: CatHealthIndicator,
  dnsHealthIndicator: DNSHealthIndicator,
): TerminusModuleOptions => ({
  endpoints: [
    {
      url: '/health',
      healthIndicators: [
        async () => catHealthIndicator.isHealthy('cat'),
        async () => dogHealthIndicator.isHealthy('dog'),
        async () =>
          dnsHealthIndicator.pingCheck('google', 'https://google.com'),
      ],
    },
  ],
});

@Module({
  imports: [
    TerminusModule.forRootAsync({
      imports: [DogModule, CatModule],
      inject: [DogHealthIndicator, CatHealthIndicator, DNSHealthIndicator],
      useFactory: getTerminusOptions,
    }),
  ],
})
export class HealthModule {}
