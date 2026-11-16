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
  });

  describe('size strings', () => {
    it('checks the heap against a size string', async () => {
      expect((await memory.checkHeap('heap', '150mb')).heap.status).toBe('up');
      expect((await memory.checkHeap('heap', '50mb')).heap.status).toBe('down');
    });

    it('checks the RSS against a size string', async () => {
      expect((await memory.checkRSS('rss', '0.25gb')).rss.status).toBe('up');
      expect((await memory.checkRSS('rss', '150mb')).rss.status).toBe('down');
    });

    it('throws on an invalid size string when the check is created', () => {
      expect(() => memory.checkHeap('heap', '150MB' as '150mb')).toThrow(
        'Heap threshold: Invalid size "150MB".',
      );
      expect(() => memory.checkRSS('rss', '150 mb' as '150mb')).toThrow(
        'RSS threshold: Invalid size "150 mb".',
      );
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
  });
});
