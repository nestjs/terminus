import { Prettify, XOR } from '../../utils/types';

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
   * The threshold in bytes
   */
  threshold: number;
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
export type DiskOptionsWithThreshold = Prettify<
  DiskOptionsBase & DiskOptionsThreshold
>;
/**
 * @internal
 */
export type DiskOptionsWithThresholdPercent = Prettify<
  DiskOptionsBase & DiskOptionsThresholdPercent
>;

/**
 * The options of the disk health indicator
 * @publicApi
 */
export type DiskHealthIndicatorOptions = Prettify<
  XOR<DiskOptionsWithThreshold, DiskOptionsWithThresholdPercent>
>;
