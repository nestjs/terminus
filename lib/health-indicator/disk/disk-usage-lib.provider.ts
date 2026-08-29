import checkDiskSpace from 'check-disk-space';
import { CHECK_DISK_SPACE_LIB } from '../../terminus.constants.js';

/**
 * Wrapper of the check-disk-space library.
 *
 * @internal
 */
export const DiskUsageLibProvider = {
  provide: CHECK_DISK_SPACE_LIB,
  useValue: checkDiskSpace,
};
