import { Module } from '@nestjs/common';
import { HealthModule } from './health/health.module.js';
import { DogModule } from './dog/dog.module.js';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [HealthModule, DogModule, ConfigModule.forRoot()],
})
export class AppModule {}
