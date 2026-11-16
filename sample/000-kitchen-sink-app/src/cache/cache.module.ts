import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { CacheHealthIndicator } from './cache.health.js';
import { CacheService } from './cache.service.js';

@Module({
  imports: [TerminusModule],
  providers: [CacheService, CacheHealthIndicator],
  exports: [CacheHealthIndicator],
})
export class CacheModule {}
