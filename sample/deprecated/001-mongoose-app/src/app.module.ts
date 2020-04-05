import { Module } from '@nestjs/common';
import { HealthModule } from './health.module';

@Module({
  imports: [HealthModule],
})
export class AppModule {}
