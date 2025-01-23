import { Injectable } from '@nestjs/common';
import { type HealthIndicatorResult } from '../';
import { STORAGE_EXCEEDED } from '../../errors/messages.constant';
import { HealthIndicatorService } from '../health-indicator.service';

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
   * Checks the heap space and returns the status
   *
   * @param key The key which will be used for the result object
   * @param options The options of the `MemoryHealthIndicator`
   *
   * @throws {StorageExceededError} In case the heap has exceeded the given threshold
   *
   *
   * @returns {Promise<HealthIndicatorResult>} The result of the health indicator check
   *
   * @example
   * // The process should not use more than 150MB memory
   * memoryHealthIndicator.checkHeap('memory_heap', 150 * 1024 * 1024);
   */
  public async checkHeap<Key extends string = string>(
    key: Key,
    heapUsedThreshold: number,
  ): Promise<HealthIndicatorResult<Key>> {
    const check = this.healthIndicatorService.check(key);
    const { heapUsed } = process.memoryUsage();

    if (heapUsedThreshold < heapUsed) {
      return check.down(STORAGE_EXCEEDED('heap'));
    }

    return check.up();
  }

  /**
   * Checks the rss space and returns the status
   *
   * @param key The key which will be used for the result object
   * @param options The options of the `MemoryHealthIndicator`
   *
   * @throws {StorageExceededError} In case the rss has exceeded the given threshold
   *
   * @returns {Promise<HealthIndicatorResult>} The result of the health indicator check
   *
   *  @example
   * // The process should not have more than 150MB allocated
   * memoryHealthIndicator.checkRSS('memory_rss', 150 * 1024 * 1024);
   */
  public async checkRSS<Key extends string = string>(
    key: Key,
    rssThreshold: number,
  ): Promise<HealthIndicatorResult<Key>> {
    const check = this.healthIndicatorService.check(key);
    const { rss } = process.memoryUsage();

    if (rssThreshold < rss) {
      return check.down(STORAGE_EXCEEDED('rss'));
    }

    return check.up();
  }
}
