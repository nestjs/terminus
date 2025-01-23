import { Injectable, Inject } from '@nestjs/common';
import { isNil } from '@nestjs/common/utils/shared.utils';
import type checkDiskSpace from 'check-disk-space';
import {
  type DiskHealthIndicatorOptions,
  type DiskOptionsWithThresholdPercent,
} from './disk-health-options.type';
import { type HealthIndicatorResult } from '../';
import { STORAGE_EXCEEDED } from '../../errors/messages.constant';
import { CHECK_DISK_SPACE_LIB } from '../../terminus.constants';
import { HealthIndicatorService } from '../health-indicator.service';

type CheckDiskSpace = typeof checkDiskSpace;

/**
 * The DiskHealthIndicator contains checks which are related
 * to the disk storage of the current running machine
 *
 * @publicApi
 * @module TerminusModule
 */
@Injectable()
export class DiskHealthIndicator {
  constructor(
    @Inject(CHECK_DISK_SPACE_LIB)
    private readonly checkDiskSpace: CheckDiskSpace,
    private readonly healthIndicatorService: HealthIndicatorService,
  ) {}

  /**
   * Checks if the given option has the property the `thresholdPercent` attribute
   *
   * @param {DiskHealthIndicatorOptions} options The options of the `DiskHealthIndicator`
   *
   * @private
   *
   * @returns {boolean} whether given option has the property the `thresholdPercent` attribute
   */
  private isOptionThresholdPercent(
    options: DiskHealthIndicatorOptions,
  ): options is DiskOptionsWithThresholdPercent {
    return !isNil(
      (options as DiskOptionsWithThresholdPercent).thresholdPercent,
    );
  }

  /**
   * Checks if the size of the given size has exceeded the
   * given threshold
   *
   * @param key The key which will be used for the result object
   *
   * @throws {HealthCheckError} In case the health indicator failed
   * @throws {StorageExceededError} In case the disk storage has exceeded the given threshold
   *
   * @returns {Promise<HealthIndicatorResult>} The result of the health indicator check
   *
   * @example
   * // The used disk storage should not exceed 250 GB
   * diskHealthIndicator.checkStorage('storage', { threshold: 250 * 1024 * 1024 * 1024, path: '/' });
   * @example
   * // The used disk storage should not exceed 50% of the full disk size
   * diskHealthIndicator.checkStorage('storage', { thresholdPercent: 0.5, path: 'C:\\' });
   */
  public async checkStorage<Key extends string = string>(
    key: Key,
    options: DiskHealthIndicatorOptions,
  ): Promise<HealthIndicatorResult<Key>> {
    const check = this.healthIndicatorService.check(key);
    const { free, size } = await this.checkDiskSpace(options.path);
    const used = size - free;

    // Prevent division by zero
    if (isNaN(size) || size === 0) {
      return check.down(STORAGE_EXCEEDED('disk storage'));
    }

    let isHealthy = false;
    if (this.isOptionThresholdPercent(options)) {
      isHealthy = options.thresholdPercent >= used / size;
    } else {
      isHealthy = options.threshold >= used;
    }

    if (!isHealthy) {
      return check.down(STORAGE_EXCEEDED('disk storage'));
    }
    return check.up();
  }
}
