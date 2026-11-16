import { type XOR } from '../../utils/types.js';
import { type ByteSize } from '../../utils/units.js';

/**
 * @internal
 */
interface DiskOptionsBase {
  /**
   * The path which should get checked
   */
  path: string;
}

/**
 * @internal
 */
interface DiskOptionsThreshold {
  /**
   * The threshold in bytes, or a string such as `'250gb'`
   */
  threshold: ByteSize;
}

/**
 * @internal
 */
interface DiskOptionsThresholdPercent {
  /**
   * The threshold in percent (e.g. 0.5)
   */
  thresholdPercent: number;
}

/**
 * @internal
 */
export type DiskOptionsWithThreshold = DiskOptionsBase & DiskOptionsThreshold;
/**
 * @internal
 */
export type DiskOptionsWithThresholdPercent = DiskOptionsBase &
  DiskOptionsThresholdPercent;

/**
 * The options of the disk health indicator
 * @publicApi
 */
export type DiskHealthIndicatorOptions = XOR<
  DiskOptionsWithThreshold,
  DiskOptionsWithThresholdPercent
>;
