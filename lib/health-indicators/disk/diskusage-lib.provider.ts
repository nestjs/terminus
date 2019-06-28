import { CHECKDISKSPACE_LIB } from '../../terminus.constants';

import * as checkdiskspace from 'check-disk-space';

/**
 * Wrapper of the check-disk-space library.
 *
 * @internal
 */
export const DiskusageLibProvider = {
  provide: CHECKDISKSPACE_LIB,
  useValue: checkdiskspace,
};
