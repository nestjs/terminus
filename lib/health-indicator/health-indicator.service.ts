import { Injectable } from '@nestjs/common';
import { type CacheEntry } from './health-check-attempt.js';
import { HealthIndicatorSession } from './health-indicator-session.js';

export { HealthCheckAttempt } from './health-check-attempt.js';
export { HealthIndicatorSession } from './health-indicator-session.js';

/**
 * Helper service which can be used to create health indicator results
 * @publicApi
 */
@Injectable()
export class HealthIndicatorService {
  private readonly cache = new Map<string, CacheEntry>();

  check<const Key extends string>(key: Key) {
    return new HealthIndicatorSession(key, this.cache);
  }
}
