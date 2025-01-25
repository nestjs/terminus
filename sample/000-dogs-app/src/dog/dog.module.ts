import { Module } from '@nestjs/common';
import { DogService } from './dog.service';
import { DogHealthIndicator } from './dog.health';
import { TerminusModule } from '@nestjs/terminus';

@Module({
  imports: [TerminusModule],
  providers: [DogService, DogHealthIndicator],
  exports: [DogHealthIndicator],
})
export class DogModule {}
