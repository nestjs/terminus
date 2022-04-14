import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { HealthModule } from './health/health.module';

@Module({
  imports: [HealthModule, HttpModule],
})
export class AppModule {}
