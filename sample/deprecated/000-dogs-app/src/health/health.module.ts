import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';

import { TerminusOptionsService } from './terminus-options.service';
import { DogModule } from '../dog/dog.module';

@Module({
  imports: [TerminusModule, DogModule],
  providers: [TerminusOptionsService],
  exports: [TerminusOptionsService],
})
export class HealthModule {}
