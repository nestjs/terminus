import { Injectable } from '@nestjs/common';

import { HealthIndicatorResult } from '../../interfaces';
import { HealthIndicator } from '../health-indicator';
import { STORAGE_EXCEEDED } from '../../errors/messages.constant';
import { StorageExceededError } from '../../errors';

/**
 * The MemoryHealthIndicator contains checks which are related
 * to the memory storage of the current running machine
 *
 * @public
 */
@Injectable()
export class MemoryHealthIndicator extends HealthIndicator {
  /**
   * Checks the heap space and returns the status
   *
   * @param key The key which will be used for the result object
   * @param options The options of the `MemoryHealthIndicator`
   *
   * @throws {StorageExceededError} In case the heap has exceeded the given threshold
   *
   * @public
   *
   * @returns {Promise<HealthIndicatorResult>} The result of the health indicator check
   *
   * @example
   * // The process should not use more than 150MB memory
   * memoryHealthIndicator.checkRSS('memory_heap', 150 * 1024 * 1024);
   */
  public async checkHeap(
    key: string,
    heapUsedThreshold: number,
  ): Promise<HealthIndicatorResult> {
    const { heapUsed } = process.memoryUsage();

    if (heapUsedThreshold < heapUsed) {
      throw new StorageExceededError(
        'heap',
        this.getStatus(key, false, {
          message: STORAGE_EXCEEDED('heap'),
        }),
      );
    }

    return this.getStatus(key, true);
  }

  /**
   * Checks the rss space and returns the status
   *
   * @param key The key which will be used for the result object
   * @param options The options of the `MemoryHealthIndicator`
   *
   * @throws {StorageExceededError} In case the rss has exceeded the given threshold
   *
   * @public
   *
   * @returns {Promise<HealthIndicatorResult>} The result of the health indicator check
   *
   *  @example
   * // The process should not have more than 150MB allocated
   * memoryHealthIndicator.checkRSS('memory_rss', 150 * 1024 * 1024);
   */
  public async checkRSS(
    key: string,
    rssThreshold: number,
  ): Promise<HealthIndicatorResult> {
    const { rss } = process.memoryUsage();

    if (rssThreshold < rss) {
      throw new StorageExceededError(
        'rss',
        this.getStatus(key, false, {
          message: STORAGE_EXCEEDED('rss'),
        }),
      );
    }

    return this.getStatus(key, true);
  }
}
