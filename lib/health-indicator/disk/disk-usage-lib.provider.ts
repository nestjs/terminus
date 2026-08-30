import { statfs } from 'node:fs/promises';
import { CHECK_DISK_SPACE_LIB } from '../../terminus.constants.js';

export type CheckDiskSpace = (path: string) => Promise<{
  free: number;
  size: number;
}>;

/**
 * Reads the disk usage of the file system the given path lives on.
 *
 * @internal
 */
export const checkDiskSpace: CheckDiskSpace = async (path: string) => {
  const { bsize, bavail, blocks } = await statfs(path);

  return {
    free: bsize * bavail,
    size: bsize * blocks,
  };
};

/**
 * Wrapper of the disk space check, so that it can be replaced in tests.
 *
 * @internal
 */
export const DiskUsageLibProvider = {
  provide: CHECK_DISK_SPACE_LIB,
  useValue: checkDiskSpace,
};
