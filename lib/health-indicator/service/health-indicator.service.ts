import { Injectable } from '@nestjs/common';
import { AttemptCache } from './attempt-cache.js';
import { HealthIndicatorSession } from './health-indicator-session.js';

/**
 * Helper service which can be used to create health indicator results
 * @publicApi
 */
@Injectable()
export class HealthIndicatorService {
  private readonly cache = new AttemptCache();

  check<const TKey extends string>(key: TKey) {
    return new HealthIndicatorSession(key, this.cache);
  }
}
