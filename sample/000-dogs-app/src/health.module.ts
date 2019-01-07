import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  DNSHealthIndicator,
  MongooseHealthIndicator,
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
  mongoHealthIndicator: MongooseHealthIndicator,
): TerminusModuleOptions => ({
  endpoints: [
    {
      url: '/health',
      healthIndicators: [
        async () => catHealthIndicator.isHealthy('cat'),
        async () => dogHealthIndicator.isHealthy('dog'),
        async () =>
          dnsHealthIndicator.pingCheck('google', 'https://google.com'),
        async () => mongoHealthIndicator.pingCheck('mongo'),
      ],
    },
  ],
});

@Module({
  imports: [
    MongooseModule.forRoot('mongodb://localhost:27017/test-health', {
      retryDelay: 5000,
      retryAttempts: 5,
      useNewUrlParser: true,
    }),
    TerminusModule.forRootAsync({
      imports: [DogModule, CatModule],
      inject: [
        DogHealthIndicator,
        CatHealthIndicator,
        DNSHealthIndicator,
        MongooseHealthIndicator,
      ],
      useFactory: getTerminusOptions,
    }),
  ],
})
export class HealthModule {}
