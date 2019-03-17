import { Module } from '@nestjs/common';
import { HealthModule } from './health/health.module';
import { DogModule } from './dog/dog.module';

@Module({
  imports: [HealthModule, DogModule],
})
export class ApplicationModule {}
