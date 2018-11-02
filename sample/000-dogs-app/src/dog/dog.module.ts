import { Module } from '@nestjs/common';
import { DogService } from './dog.service';
import { DogHealthIndicator } from './dog.healthcheck';

@Module({
  providers: [DogService, DogHealthIndicator],
  exports: [DogHealthIndicator],
})
export class DogModule {}
