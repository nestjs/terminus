import { CHECK_DISK_SPACE_LIB } from '../../terminus.constants';

import checkDiskSpace from 'check-disk-space';

/**
 * Wrapper of the check-disk-space library.
 *
 * @internal
 */
export const DiskUsageLibProvider = {
  provide: CHECK_DISK_SPACE_LIB,
  useValue: checkDiskSpace,
};
