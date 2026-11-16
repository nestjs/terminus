import { Injectable } from '@nestjs/common';
import { HealthIndicatorService } from '@nestjs/terminus';
import { CacheService } from './cache.service.js';

/**
 * A custom indicator that decides the state itself. The app still works
 * without the cache, so it is `degraded` and not `down`.
 */
@Injectable()
export class CacheHealthIndicator {
  constructor(
    private readonly healthIndicatorService: HealthIndicatorService,
    private readonly cache: CacheService,
  ) {}

  async isHealthy<const TKey extends string>(key: TKey) {
    const indicator = this.healthIndicatorService.check(key);
    const isConnected = await this.cache.isConnected();

    if (!isConnected) {
      return indicator.degraded('cache unreachable, serving without cache');
    }

    return indicator.up();
  }
}
