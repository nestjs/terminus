import { Test } from '@nestjs/testing';
import { HealthCheckExecutor } from './health-check-executor.service';
import {
  HealthIndicatorResult,
  HealthIndicatorService,
} from '../health-indicator';
import { HealthCheckResult } from './health-check-result.interface';
import { HealthCheckError } from '../health-check/health-check.error';

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
  });
});
