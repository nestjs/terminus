import { checkDiskSpace } from './disk-usage-lib.provider.js';

vi.mock('node:fs/promises', () => ({
  statfs: vi.fn(),
}));

const { statfs } = await import('node:fs/promises');

describe('checkDiskSpace', () => {
  it('should report free and total bytes from the block counts', async () => {
    vi.mocked(statfs).mockResolvedValue({
      bsize: 4096,
      bavail: 100,
      blocks: 1000,
    } as any);

    await expect(checkDiskSpace('/')).resolves.toEqual({
      free: 409_600,
      size: 4_096_000,
    });
  });

  it('should pass the given path through', async () => {
    vi.mocked(statfs).mockResolvedValue({
      bsize: 1,
      bavail: 0,
      blocks: 0,
    } as any);

    await checkDiskSpace('/mnt/data');

    expect(statfs).toHaveBeenCalledWith('/mnt/data');
  });
});
