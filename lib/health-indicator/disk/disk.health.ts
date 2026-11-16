import { Injectable, Inject } from '@nestjs/common';
import {
  type DiskHealthIndicatorOptions,
  type DiskOptionsWithThresholdPercent,
} from './disk-health-options.type.js';
import { STORAGE_EXCEEDED } from '../../errors/messages.constant.js';
import { CHECK_DISK_SPACE_LIB } from '../../terminus.constants.js';
import { toBytes } from '../../utils/units.js';
import { type CheckDiskSpace } from './disk-usage-lib.provider.js';
import { type HealthCheckAttempt } from '../service/health-check-attempt.js';
import { HealthIndicatorService } from '../service/health-indicator.service.js';

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
    return (
      (options as DiskOptionsWithThresholdPercent).thresholdPercent != null
    );
  }

  /**
   * Checks if the used disk storage has exceeded the given threshold.
   * `down` when it has, or when the disk usage of `path` cannot be read
   * (for example, the path does not exist).
   *
   * Returns a `HealthCheckAttempt`, so you can chain e.g. `.degradedOnFailure()`.
   *
   * @param key The key which will be used for the result object
   * @param options The path to check and the threshold in bytes or in percent
   *
   * @example
   * // The used disk storage should not exceed 250 GB
   * diskHealthIndicator.checkStorage('storage', { threshold: '250gb', path: '/' });
   * // A full disk is a warning, not an outage; give up after 2 seconds
   * diskHealthIndicator
   *   .checkStorage('storage', { thresholdPercent: 0.9, path: '/' })
   *   .degradedOnFailure()
   *   .withTimeout(2000);
   */
  public checkStorage<Key extends string = string>(
    key: Key,
    options: DiskHealthIndicatorOptions,
  ): HealthCheckAttempt<Key> {
    // `0` is not used with `thresholdPercent`
    const threshold = toBytes(options.threshold ?? 0, 'Disk threshold');
    return this.healthIndicatorService.check(key).attempt(async () => {
      const { free, size } = await this.checkDiskSpace(options.path);
      const used = size - free;

      // Prevent division by zero
      if (isNaN(size) || size === 0) {
        throw new Error(STORAGE_EXCEEDED('disk storage'));
      }

      let isHealthy = false;
      if (this.isOptionThresholdPercent(options)) {
        isHealthy = options.thresholdPercent >= used / size;
      } else {
        isHealthy = threshold >= used;
      }

      if (!isHealthy) {
        throw new Error(STORAGE_EXCEEDED('disk storage'));
      }
    });
  }
}
