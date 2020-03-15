import { Module } from '@nestjs/common';
import { HealthService } from './health.controller';

@Module({
  controllers: [HealthService],
})
export class ApplicationModule {}
