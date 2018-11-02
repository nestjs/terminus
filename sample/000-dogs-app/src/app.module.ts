import { Module, DynamicModule } from '@nestjs/common';
import { DogModule } from './dog/dog.module';
import { CatModule } from './cat/cat.module';
import { TerminusModule, TerminusModuleOptions } from '../../../lib';
import { DogHealthIndicator } from './dog/dog.healthcheck';

const getTerminusOptions = (
  dogHealthIndicator: DogHealthIndicator,
  catHealthIndicator: DogHealthIndicator,
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
      inject: [DogHealthIndicator, DogHealthIndicator],
      useFactory: getTerminusOptions,
    }),
  ],
})
export class ApplicationModule {}
