import { Module } from '@nestjs/common';
import { DogService } from './dog.service';
import { DogHealthIndicator } from './dog.health';

@Module({
  providers: [DogService, DogHealthIndicator],
  exports: [DogHealthIndicator],
})
export class DogModule {}
