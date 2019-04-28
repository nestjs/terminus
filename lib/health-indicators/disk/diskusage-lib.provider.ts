import { CHECKDISKSPACE_LIB } from '../../terminus.constants';

// FIXME: Add typings to check-disk-space
import * as checkdiskspace from 'check-disk-space';

/**
 * The type of the check-disc-space library
 *
 * @internal
 */
export type CheckDiskSpace = typeof checkdiskspace;
/**
 * Wrapper of the check-disk-space library.
 *
 * @internal
 */
export const DiskusageLibProvider = {
  provide: CHECKDISKSPACE_LIB,
  useValue: checkdiskspace,
};
