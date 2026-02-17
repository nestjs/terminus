import { Module } from '@nestjs/common';
import { HealthModule } from './health/health.module';
import { DogModule } from './dog/dog.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [HealthModule, DogModule, ConfigModule.forRoot()],
})
export class AppModule {}
