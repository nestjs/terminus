import { DiskHealthIndicator } from './disk.health.js';
import { checkDiskSpace } from './disk-usage-lib.provider.js';
import { HealthIndicatorService } from '../service/health-indicator.service.js';

const GB = 1024 ** 3;
const message = 'Used disk storage exceeded the set threshold';

describe('DiskHealthIndicator', () => {
  // 100 GB disk, 40 GB used
  const diskSpace = vi.fn(async (_path: string) => ({
    free: 60 * GB,
    size: 100 * GB,
  }));
  let disk: DiskHealthIndicator;

  beforeEach(() => {
    diskSpace.mockClear();
    disk = new DiskHealthIndicator(diskSpace, new HealthIndicatorService());
  });

  describe('#checkStorage', () => {
    it('is up below the threshold and reads the given path', async () => {
      const result = await disk.checkStorage('disk', {
        path: '/data',
        threshold: 50 * GB,
      });
      expect(result).toEqual({
        disk: { status: 'up', responseTime: expect.any(Number) },
      });
      expect(diskSpace).toHaveBeenCalledWith('/data');
    });

    it('is down above the threshold, with the same message as before', async () => {
      const result = await disk.checkStorage('disk', {
        path: '/',
        threshold: 30 * GB,
      });
      expect(result).toEqual({
        disk: { status: 'down', message, responseTime: expect.any(Number) },
      });
    });

    it('accepts a size string as the threshold', async () => {
      const up = await disk.checkStorage('disk', {
        path: '/',
        threshold: '50gb',
      });
      const down = await disk.checkStorage('disk', {
        path: '/',
        threshold: '30gb',
      });
      expect(up.disk.status).toBe('up');
      expect(down.disk).toMatchObject({ status: 'down', message });
    });

    it('throws on an invalid size string when the check is created', () => {
      expect(() =>
        disk.checkStorage('disk', { path: '/', threshold: '50GB' as '50gb' }),
      ).toThrow('Disk threshold: Invalid size "50GB".');
    });

    it('is up below thresholdPercent', async () => {
      const result = await disk.checkStorage('disk', {
        path: '/',
        thresholdPercent: 0.5,
      });
      expect(result.disk.status).toBe('up');
    });

    it('is down above thresholdPercent', async () => {
      const result = await disk.checkStorage('disk', {
        path: '/',
        thresholdPercent: 0.3,
      });
      expect(result.disk).toMatchObject({ status: 'down', message });
    });

    it('is down when the disk size is 0', async () => {
      diskSpace.mockResolvedValueOnce({ free: 0, size: 0 });
      const result = await disk.checkStorage('disk', {
        path: '/',
        thresholdPercent: 0.5,
      });
      expect(result.disk).toMatchObject({ status: 'down', message });
    });

    it('is down instead of throwing when the path does not exist', async () => {
      const real = new DiskHealthIndicator(
        checkDiskSpace,
        new HealthIndicatorService(),
      );
      const result = await real.checkStorage('disk', {
        path: '/does/not/exist',
        threshold: GB,
      });
      expect(result.disk).toMatchObject({
        status: 'down',
        message: expect.stringContaining('ENOENT'),
      });
    });

    it('is degraded instead of down with degradedOnFailure()', async () => {
      const result = await disk
        .checkStorage('disk', { path: '/', threshold: 30 * GB })
        .degradedOnFailure();
      expect(result.disk).toMatchObject({ status: 'degraded', message });
    });

    it('is down when slower than withTimeout()', async () => {
      diskSpace.mockImplementationOnce(
        () => new Promise((resolve) => setTimeout(resolve, 200)),
      );
      const result = await disk
        .checkStorage('disk', { path: '/', threshold: 50 * GB })
        .withTimeout(20);
      expect(result.disk).toMatchObject({
        status: 'down',
        message: 'timeout of 20ms exceeded',
      });
    });

    it('is degraded with degradedAfter() when the check is slow', async () => {
      diskSpace.mockImplementationOnce(async () => {
        await new Promise((resolve) => setTimeout(resolve, 30));
        return { free: 60 * GB, size: 100 * GB };
      });
      const result = await disk
        .checkStorage('disk', { path: '/', threshold: 50 * GB })
        .degradedAfter(10);
      expect(result.disk.status).toBe('degraded');
    });

    it('serves a cached result with cacheFor()', async () => {
      const check = () =>
        disk
          .checkStorage('disk', { path: '/', threshold: 50 * GB })
          .cacheFor(10_000);
      await check();
      expect((await check()).disk).toMatchObject({
        status: 'up',
        cachedResponse: true,
      });
      expect(diskSpace).toHaveBeenCalledTimes(1);
    });

    it('adds data with withData()', async () => {
      const result = await disk
        .checkStorage('disk', { path: '/', threshold: 50 * GB })
        .withData({ mount: '/' });
      expect(result.disk).toMatchObject({ status: 'up', mount: '/' });
    });
  });
});
