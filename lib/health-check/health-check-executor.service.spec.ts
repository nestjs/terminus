import { expectTypeOf } from 'vitest';
import { Test } from '@nestjs/testing';
import { HealthCheckExecutor } from './health-check-executor.service.js';
import {
  HealthIndicatorResult,
  HealthIndicatorService,
  type InferHealthIndicatorResult,
} from '../health-indicator/index.js';
import { HealthCheckResult } from './health-check-result.interface.js';
import {
  TERMINUS_LOGGER,
  TERMINUS_MODULE_OPTIONS,
} from '../terminus.constants.js';
import { setTimeout } from 'node:timers/promises';

vi.mock('node:timers/promises', () => ({
  setTimeout: vi.fn(),
}));

const loggerMock = { log: vi.fn(), error: vi.fn(), warn: vi.fn() };

////////////////////////////////////////////////////////////////

const healthIndicator = async (h: HealthIndicatorService) =>
  h.check('healthy').up();

const unhealthyHealthIndicator = async (h: HealthIndicatorService) =>
  h.check('unhealthy').down();

const unhealthyHealthIndicatorSync = (h: HealthIndicatorService) =>
  h.check('unhealthy').down();

////////////////////////////////////////////////////////////////

describe('HealthCheckExecutorService', () => {
  let healthCheckExecutor: HealthCheckExecutor;
  let h: HealthIndicatorService;

  const bootstrap = async (options = {}) => {
    vi.clearAllMocks();
    const context = await Test.createTestingModule({
      providers: [
        HealthCheckExecutor,
        HealthIndicatorService,
        { provide: TERMINUS_LOGGER, useValue: loggerMock },
        { provide: TERMINUS_MODULE_OPTIONS, useValue: options },
      ],
    }).compile();
    healthCheckExecutor = context.get(HealthCheckExecutor);
    h = context.get(HealthIndicatorService);
  };

  beforeEach(() => bootstrap());

  describe('execute', () => {
    it('should support HealthCheckAttempt in the health indicators array', async () => {
      const attempt = h.check('db').attempt(async () => {});
      const result = await healthCheckExecutor.execute([attempt]);
      expectTypeOf<
        keyof InferHealthIndicatorResult<typeof attempt>
      >().toEqualTypeOf<'db'>();
      expect(result).toEqual<HealthCheckResult>({
        status: 'ok',
        info: { db: { status: 'up', responseTime: expect.any(Number) } },
        error: {},
        details: { db: { status: 'up', responseTime: expect.any(Number) } },
      });
    });

    it('should support a failing HealthCheckAttempt', async () => {
      const attempt = h.check('db').attempt(async () => {
        throw new Error('Connection refused');
      });
      const result = await healthCheckExecutor.execute([attempt]);
      expect(result).toEqual<HealthCheckResult>({
        status: 'error',
        info: {},
        error: {
          db: {
            status: 'down',
            message: 'Connection refused',
            responseTime: expect.any(Number),
          },
        },
        details: {
          db: {
            status: 'down',
            message: 'Connection refused',
            responseTime: expect.any(Number),
          },
        },
      });
    });

    it('should support mixing HealthCheckAttempt with regular functions', async () => {
      const attempt = h.check('db').attempt(async () => {});
      const result = await healthCheckExecutor.execute([
        () => healthIndicator(h),
        attempt,
      ]);
      expect(result).toEqual<HealthCheckResult>({
        status: 'ok',
        info: {
          healthy: { status: 'up' },
          db: { status: 'up', responseTime: expect.any(Number) },
        },
        error: {},
        details: {
          healthy: { status: 'up' },
          db: { status: 'up', responseTime: expect.any(Number) },
        },
      });
    });
    it('should return a result object without errors', async () => {
      const result = await healthCheckExecutor.execute([
        () => healthIndicator(h),
      ]);
      expect(result).toEqual<HealthCheckResult>({
        status: 'ok',
        info: {
          healthy: {
            status: 'up',
          },
        },
        error: {},
        details: {
          healthy: {
            status: 'up',
          },
        },
      });
    });

    it('should return a result object with errors', async () => {
      const result = await healthCheckExecutor.execute([
        () => unhealthyHealthIndicator(h),
      ]);
      expect(result).toEqual<HealthCheckResult>({
        status: 'error',
        info: {},
        error: {
          unhealthy: {
            status: 'down',
          },
        },
        details: {
          unhealthy: {
            status: 'down',
          },
        },
      });
    });

    it('should return a result object with errors with sync indicator function', async () => {
      const result = await healthCheckExecutor.execute([
        () => unhealthyHealthIndicatorSync(h),
      ]);
      expect(result).toEqual<HealthCheckResult>({
        status: 'error',
        info: {},
        error: {
          unhealthy: {
            status: 'down',
          },
        },
        details: {
          unhealthy: {
            status: 'down',
          },
        },
      });
    });

    it('should return a result object without errors and with errors', async () => {
      const result = await healthCheckExecutor.execute([
        () => unhealthyHealthIndicator(h),
        () => healthIndicator(h),
      ]);
      expect(result).toEqual<HealthCheckResult>({
        status: 'error',
        info: {
          healthy: {
            status: 'up',
          },
        },
        error: {
          unhealthy: {
            status: 'down',
          },
        },
        details: {
          healthy: {
            status: 'up',
          },
          unhealthy: {
            status: 'down',
          },
        },
      });
    });
  });

  describe('degraded indicators', () => {
    it('should aggregate a degraded indicator into a degraded status with HTTP-safe buckets', async () => {
      const result = await healthCheckExecutor.execute([
        () => h.check('db').degraded('slow'),
        () => h.check('redis').up(),
      ]);
      expect(result).toEqual<HealthCheckResult>({
        status: 'degraded',
        info: {
          db: { status: 'degraded', message: 'slow' },
          redis: { status: 'up' },
        },
        error: {},
        details: {
          db: { status: 'degraded', message: 'slow' },
          redis: { status: 'up' },
        },
      });
    });

    it('should report error when a down indicator accompanies a degraded one', async () => {
      const result = await healthCheckExecutor.execute([
        () => h.check('db').degraded(),
        () => h.check('redis').down(),
      ]);
      expect(result.status).toBe('error');
    });
  });

  describe('beforeApplicationShutdown', () => {
    it('should report shutting_down before the graceful timeout elapses', async () => {
      await bootstrap({ gracefulShutdownTimeoutMs: 1000 });
      let statusDuringWait: string | undefined;
      vi.mocked(setTimeout).mockImplementationOnce(async () => {
        statusDuringWait = (await healthCheckExecutor.execute([])).status;
      });

      await healthCheckExecutor.beforeApplicationShutdown('SIGTERM');

      expect(setTimeout).toHaveBeenCalledWith(1000);
      expect(statusDuringWait).toBe('shutting_down');
      expect(loggerMock.log).toHaveBeenCalledWith(
        'Received termination signal SIGTERM',
      );
      expect(loggerMock.log).toHaveBeenCalledWith(
        'Awaiting 1000ms before shutdown',
      );
      expect(loggerMock.log).toHaveBeenCalledWith(
        'Timeout reached, shutting down now',
      );
    });

    it('should not wait if the signal is not SIGTERM', async () => {
      await bootstrap({ gracefulShutdownTimeoutMs: 1000 });
      await healthCheckExecutor.beforeApplicationShutdown('SIGINT');
      expect(setTimeout).not.toHaveBeenCalled();
      expect((await healthCheckExecutor.execute([])).status).toBe(
        'shutting_down',
      );
    });

    it.each([{ gracefulShutdownTimeoutMs: 0 }, {}])(
      'should not wait nor log with options %j',
      async (options) => {
        await bootstrap(options);
        await healthCheckExecutor.beforeApplicationShutdown('SIGTERM');
        expect(setTimeout).not.toHaveBeenCalled();
        expect(loggerMock.log).not.toHaveBeenCalled();
      },
    );
  });
});
