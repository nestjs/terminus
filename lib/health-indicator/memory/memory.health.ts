import { Injectable } from '@nestjs/common';
import { STORAGE_EXCEEDED } from '../../errors/messages.constant.js';
import { type ByteSize, toBytes } from '../../utils/units.js';
import { type HealthCheckAttempt } from '../service/health-check-attempt.js';
import { HealthIndicatorService } from '../service/health-indicator.service.js';

/**
 * The MemoryHealthIndicator contains checks which are related
 * to the memory storage of the current running machine
 *
 * @publicApi
 * @module TerminusModule
 */
@Injectable()
export class MemoryHealthIndicator {
  constructor(
    private readonly healthIndicatorService: HealthIndicatorService,
  ) {}

  /**
   * Checks the heap space. `down` when the process uses more than
   * `heapUsedThreshold` bytes of heap.
   *
   * Returns a `HealthCheckAttempt`, so you can chain e.g. `.degradedOnFailure()`.
   *
   * @param key The key which will be used for the result object
   * @param heapUsedThreshold The most heap the process may use, in bytes or
   * as a string such as `'150mb'`
   *
   * @example
   * // The process should not use more than 150MB heap
   * memoryHealthIndicator.checkHeap('memory_heap', '150mb');
   * // More heap is a warning, not an outage
   * memoryHealthIndicator
   *   .checkHeap('memory_heap', 150 * 1024 * 1024)
   *   .degradedOnFailure();
   */
  public checkHeap<Key extends string = string>(
    key: Key,
    heapUsedThreshold: ByteSize,
  ): HealthCheckAttempt<Key> {
    const threshold = toBytes(heapUsedThreshold, 'Heap threshold');
    return this.healthIndicatorService.check(key).attempt(() => {
      if (threshold < process.memoryUsage().heapUsed) {
        throw new Error(STORAGE_EXCEEDED('heap'));
      }
    });
  }

  /**
   * Checks the RSS (all memory the process has allocated). `down` when it is
   * more than `rssThreshold` bytes.
   *
   * Returns a `HealthCheckAttempt`, so you can chain e.g. `.degradedOnFailure()`.
   *
   * @param key The key which will be used for the result object
   * @param rssThreshold The most memory the process may have allocated, in
   * bytes or as a string such as `'300mb'`
   *
   * @example
   * // The process should not have more than 300MB allocated
   * memoryHealthIndicator.checkRSS('memory_rss', '300mb');
   * // More memory is a warning, not an outage
   * memoryHealthIndicator
   *   .checkRSS('memory_rss', 300 * 1024 * 1024)
   *   .degradedOnFailure();
   */
  public checkRSS<Key extends string = string>(
    key: Key,
    rssThreshold: ByteSize,
  ): HealthCheckAttempt<Key> {
    const threshold = toBytes(rssThreshold, 'RSS threshold');
    return this.healthIndicatorService.check(key).attempt(() => {
      if (threshold < process.memoryUsage().rss) {
        throw new Error(STORAGE_EXCEEDED('rss'));
      }
    });
  }
}
