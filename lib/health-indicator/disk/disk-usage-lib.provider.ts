import { CHECK_DIST_SPACE_LIB } from '../../terminus.constants';

import checkDistSpace from 'check-disk-space';

/**
 * Wrapper of the check-disk-space library.
 *
 * @internal
 */
export const DiskUsageLibProvider = {
  provide: CHECK_DIST_SPACE_LIB,
  useValue: checkDistSpace,
};
