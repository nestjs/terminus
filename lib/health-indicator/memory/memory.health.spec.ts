import { MemoryHealthIndicator } from './memory.health.js';
import { HealthIndicatorService } from '../service/health-indicator.service.js';

const MB = 1024 * 1024;

describe('MemoryHealthIndicator', () => {
  let memory: MemoryHealthIndicator;
  const memoryUsage = vi.spyOn(process, 'memoryUsage');

  beforeEach(() => {
    memory = new MemoryHealthIndicator(new HealthIndicatorService());
    memoryUsage.mockReturnValue({
      heapUsed: 100 * MB,
      rss: 200 * MB,
    } as NodeJS.MemoryUsage);
  });
  afterAll(() => memoryUsage.mockRestore());

  describe('#checkHeap', () => {
    it('is up below the threshold', async () => {
      expect(await memory.checkHeap('heap', 150 * MB)).toEqual({
        heap: { status: 'up', responseTime: expect.any(Number) },
      });
    });

    it('is down above the threshold, with the same message as before', async () => {
      expect(await memory.checkHeap('heap', 50 * MB)).toEqual({
        heap: {
          status: 'down',
          message: 'Used heap exceeded the set threshold',
          responseTime: expect.any(Number),
        },
      });
    });

    it('is up at exactly the threshold', async () => {
      const result = await memory.checkHeap('heap', 100 * MB);
      expect(result.heap.status).toBe('up');
    });

    it('reads the memory when awaited, not when called', async () => {
      const attempt = memory.checkHeap('heap', 150 * MB);
      memoryUsage.mockReturnValue({ heapUsed: 300 * MB } as NodeJS.MemoryUsage);
      expect((await attempt).heap.status).toBe('down');
    });

    it('is degraded instead of down with degradedOnFailure()', async () => {
      expect(
        await memory.checkHeap('heap', 50 * MB).degradedOnFailure(),
      ).toEqual({
        heap: {
          status: 'degraded',
          message: 'Used heap exceeded the set threshold',
          responseTime: expect.any(Number),
        },
      });
    });

    it('adds data with withData()', async () => {
      const result = await memory
        .checkHeap('heap', 150 * MB)
        .withSuccessData(() => ({ heapUsed: process.memoryUsage().heapUsed }));
      expect(result.heap).toMatchObject({ status: 'up', heapUsed: 100 * MB });
    });

    it('serves a cached result with cacheFor()', async () => {
      const service = new HealthIndicatorService();
      const cached = new MemoryHealthIndicator(service);
      await cached.checkHeap('heap', 150 * MB).cacheFor(10_000);
      memoryUsage.mockReturnValue({ heapUsed: 300 * MB } as NodeJS.MemoryUsage);
      expect(
        (await cached.checkHeap('heap', 150 * MB).cacheFor(10_000)).heap,
      ).toMatchObject({ status: 'up', cachedResponse: true });
    });

    it('is degraded with degradedAfter() when the check is slow', async () => {
      expect(
        (await memory.checkHeap('heap', 150 * MB).degradedAfter(0)).heap.status,
      ).toBe('degraded');
    });

    it('accepts withTimeout()', async () => {
      expect(
        (await memory.checkHeap('heap', 150 * MB).withTimeout(100)).heap.status,
      ).toBe('up');
    });
  });

  describe('#checkRSS', () => {
    it('is up below the threshold', async () => {
      expect(await memory.checkRSS('rss', 250 * MB)).toEqual({
        rss: { status: 'up', responseTime: expect.any(Number) },
      });
    });

    it('is down above the threshold, with the same message as before', async () => {
      expect(await memory.checkRSS('rss', 150 * MB)).toEqual({
        rss: {
          status: 'down',
          message: 'Used rss exceeded the set threshold',
          responseTime: expect.any(Number),
        },
      });
    });

    it('is degraded instead of down with degradedOnFailure()', async () => {
      const result = await memory.checkRSS('rss', 150 * MB).degradedOnFailure();
      expect(result.rss).toMatchObject({
        status: 'degraded',
        message: 'Used rss exceeded the set threshold',
      });
    });
  });
});
