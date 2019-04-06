import { XOR } from '../../utils/types';

interface DiskOptionsBase {
  /**
   * The path which should get checked
   */
  path: string;
}

interface DiskOptionsThreshold {
  /**
   * The threshold in bytes
   */
  threshold: number;
}

interface DiskOptionsThresholdPercent {
  /**
   * The threshold in percent (e.g. 0.5)
   */
  thresholdPercent: number;
}

export type DiskOptionsWithThreshold = DiskOptionsBase & DiskOptionsThreshold;
export type DiskOptionsWithThresholdPercent = DiskOptionsBase &
  DiskOptionsThresholdPercent;

/**
 * The options of the disk health indicator
 */
export type DiskHealthIndicatorOptions = XOR<
  DiskOptionsWithThreshold,
  DiskOptionsWithThresholdPercent
>;
