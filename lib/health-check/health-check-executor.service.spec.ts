import { Test } from '@nestjs/testing';
import { HealthCheckError } from '../health-check/health-check.error';
import {
  HealthIndicatorResult,
  HealthIndicatorService,
} from '../health-indicator';
import { HealthCheckExecutor } from './health-check-executor.service';
import { HealthCheckResult } from './health-check-result.interface';
import { TERMINUS_FAIL_READINESS_ON_SHUTDOWN } from './shutdown.constants';

////////////////////////////////////////////////////////////////

const healthIndicator = async (h: HealthIndicatorService) =>
  h.check('healthy').up();

const unhealthyHealthIndicator = async (h: HealthIndicatorService) =>
  h.check('unhealthy').down();

const unhealthyHealthIndicatorSync = (h: HealthIndicatorService) =>
  h.check('unhealthy').down();

// Legacy health indicator functions

const legacyHealthyIndicator = async (): Promise<HealthIndicatorResult> => {
  return {
    healthy: {
      status: 'up',
    },
  };
};

const legacyUnhealthyIndicator = async (): Promise<HealthIndicatorResult> => {
  throw new HealthCheckError('error', {
    unhealthy: {
      status: 'down',
    },
  });
};

const legacyUnhealthyIndicatorSync = () => {
  throw new HealthCheckError('error', {
    unhealthy: {
      status: 'down',
    },
  });
};

const legacyUnhealthyIndicatorWithoutError =
  async (): Promise<HealthIndicatorResult> => {
    return {
      unhealthy: {
        status: 'down',
      },
    };
  };

////////////////////////////////////////////////////////////////

describe('HealthCheckExecutorService', () => {
  let healthCheckExecutor: HealthCheckExecutor;
  let h: HealthIndicatorService;

  beforeEach(async () => {
    const module = Test.createTestingModule({
      providers: [HealthCheckExecutor, HealthIndicatorService],
    });
    const context = await module.compile();
    healthCheckExecutor = context.get(HealthCheckExecutor);
    h = context.get(HealthIndicatorService);
  });

  describe('execute', () => {
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

    describe('backwards compatibility', () => {
      it('should return a result object without errors', async () => {
        const result = await healthCheckExecutor.execute([
          () => legacyHealthyIndicator(),
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
          () => legacyUnhealthyIndicator(),
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
          () => legacyUnhealthyIndicatorSync(),
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
          () => legacyUnhealthyIndicator(),
          () => legacyHealthyIndicator(),
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

      it('should return a result object with errors when error is not an instance of HealthCheckError', async () => {
        const result = await healthCheckExecutor.execute([
          () => legacyUnhealthyIndicatorWithoutError(),
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
    });

    describe('shutdown behavior', () => {
      it('should return status "error" while shutting down when failReadinessOnShutdown is enabled', async () => {
        const moduleRef = await Test.createTestingModule({
          providers: [
            HealthCheckExecutor,
            HealthIndicatorService,
            { provide: TERMINUS_FAIL_READINESS_ON_SHUTDOWN, useValue: true },
          ],
        }).compile();

        const exec = moduleRef.get(HealthCheckExecutor);
        const svc = moduleRef.get(HealthIndicatorService);

        exec.beforeApplicationShutdown(); // simulate SIGTERM
        const result = await exec.execute([() => healthIndicator(svc)]);

        expect(result.status).toBe('error');
        // indicators still execute; info should contain healthy result
        expect(result.info).toHaveProperty('healthy.status', 'up');
        // overall details reflect the indicator outcome
        expect(result.details).toHaveProperty('healthy.status', 'up');
      });

      it('should return status "shutting_down" while shutting down when failReadinessOnShutdown is disabled', async () => {
        const moduleRef = await Test.createTestingModule({
          providers: [HealthCheckExecutor, HealthIndicatorService],
        }).compile();

        const exec = moduleRef.get(HealthCheckExecutor);
        const svc = moduleRef.get(HealthIndicatorService);

        exec.beforeApplicationShutdown(); // simulate SIGTERM
        const result = await exec.execute([() => healthIndicator(svc)]);

        expect(result.status).toBe('shutting_down');
        // indicator still ran
        expect(result.info).toHaveProperty('healthy.status', 'up');
      });
    });
  });
});
