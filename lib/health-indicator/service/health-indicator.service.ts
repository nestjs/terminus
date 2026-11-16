import {
  Inject,
  Injectable,
  type LoggerService,
  Optional,
} from '@nestjs/common';
import { TERMINUS_LOGGER } from '../../terminus.constants.js';
import { AttemptCache } from './attempt-cache.js';
import { HealthIndicatorSession } from './health-indicator-session.js';

/**
 * Helper service which can be used to create health indicator results
 * @publicApi
 */
@Injectable()
export class HealthIndicatorService {
  private readonly cache = new AttemptCache();

  /**
   * @param logger The Terminus logger, for the warnings of the attempts
   */
  constructor(
    @Optional()
    @Inject(TERMINUS_LOGGER)
    private readonly logger?: LoggerService,
  ) {}

  check<const TKey extends string>(key: TKey) {
    return new HealthIndicatorSession(key, this.cache, this.logger);
  }
}
