import { Module } from '@nestjs/common';
import { TerminusModule, TerminusModuleOptions } from '../../../lib';

import { DogModule } from './dog/dog.module';
import { CatModule } from './cat/cat.module';

import { DogHealthIndicator } from './dog/dog.health';
import { CatHealthIndicator } from './cat/cat.health';

const getTerminusOptions = (
  dogHealthIndicator: DogHealthIndicator,
  catHealthIndicator: CatHealthIndicator,
): TerminusModuleOptions => ({
  endpoints: [
    {
      url: '/health',
      healthIndicators: [
        async () => catHealthIndicator.isHealthy('cat'),
        async () => dogHealthIndicator.isHealthy('dog'),
      ],
    },
  ],
});

@Module({
  imports: [
    TerminusModule.forRootAsync({
      imports: [DogModule, CatModule],
      inject: [DogHealthIndicator, CatHealthIndicator],
      useFactory: getTerminusOptions,
    }),
  ],
})
export class HealthModule {}
