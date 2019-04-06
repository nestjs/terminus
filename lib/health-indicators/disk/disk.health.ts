import { Injectable, Inject } from '@nestjs/common';
import { isNil } from '@nestjs/common/utils/shared.utils';
import * as checkdiskspace from 'check-disk-space';

import { HealthIndicatorResult } from '../../interfaces';
import { HealthIndicator } from '../health-indicator';
import { CHECKDISKSPACE_LIB } from '../../terminus.constants';
import { DiskStorageExceededError } from '../../errors/disk-threshold.error';
import { DISK_STORAGE_EXCEEDED } from '../../errors/messages.constant';
import {
  DiskHealthIndicatorOptions,
  DiskOptionsWithThresholdPercent,
} from './disk-health-options.type';

type CheckDiskSpace = typeof checkdiskspace;

/**
 * The DiskHealthIndicator contains checks which are related
 * to the disk storage of the current running machine
 *
 * @public
 */
@Injectable()
export class DiskHealthIndicator extends HealthIndicator {
  /**
   * Initializes the health indicator
   *
   * @param {CheckDiskSpace} checkDiskSpace The check-disk-space library
   *
   * @public
   */
  constructor(
    @Inject(CHECKDISKSPACE_LIB)
    private checkDiskSpace: CheckDiskSpace,
  ) {
    super();
  }

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
   * Checks the storage space and returns the status
   * @param key The key which will be used for the result object
   * @param options The options of the `DiskHealthIndicator`
   *
   * @throws {DiskStorageExceededError} In case the disk storage has exceeded the given threshold
   *
   * @private
   *
   * @returns {Promise<HealthIndicatorResult>} The result of the health indicator check
   */
  private async checkStorage(
    key: string,
    options: DiskHealthIndicatorOptions,
  ): Promise<HealthIndicatorResult> {
    const { free, size } = await this.checkDiskSpace(options.path);
    const used = size - free;

    let isHealthy = false;
    if (this.isOptionThresholdPercent(options)) {
      isHealthy = options.thresholdPercent >= used / size;
    } else {
      isHealthy = options.threshold >= size - free;
    }

    if (!isHealthy) {
      throw new DiskStorageExceededError(
        this.getStatus(key, false, {
          message: DISK_STORAGE_EXCEEDED,
        }),
      );
    }
    return this.getStatus(key, true);
  }

  /**
   * Checks if the given url respons in the given timeout
   * and returns a result object corresponding to the result
   * @param key The key which will be used for the result object
   *
   * @throws {HealthCheckError} In case the health indicator failed
   * @throws {DiskStorageExceededError} In case the disk storage has exceeded the given threshold
   *
   * @returns {Promise<HealthIndicatorResult>} The result of the health indicator check
   *
   * @example
   * diskHealthIndicator.checkStorage('storage', { threshold: 120000000000, path: '/' });
   * @example
   * diskHealthIndicator.checkSotrage('storage', { thresholdPercent: 0.5, path: 'C:\\' });
   */
  async check(
    key: string,
    options: DiskHealthIndicatorOptions,
  ): Promise<HealthIndicatorResult> {
    return await this.checkStorage(key, options);
  }
}
