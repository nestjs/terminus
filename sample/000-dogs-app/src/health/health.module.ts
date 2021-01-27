import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { DogModule } from '../dog/dog.module';
import { HealthController } from './health.controller';

@Module({
  imports: [TerminusModule, DogModule],
  controllers: [HealthController]
})
export class HealthModule {}
