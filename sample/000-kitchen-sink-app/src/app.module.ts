import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthModule } from './health/health.module.js';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), HealthModule],
})
export class AppModule {}
