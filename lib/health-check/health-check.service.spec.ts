import { Test } from '@nestjs/testing';
import { HealthCheckService } from './health-check.service';
import { HealthCheckExecutor } from './health-check-executor.service';

const healthCheckExecutorMock: Partial<HealthCheckExecutor> = {
  execute: jest.fn(),
};

describe('HealthCheckService', () => {
  let healthCheckExecutor: HealthCheckExecutor;
  let healthCheckService: HealthCheckService;

  beforeEach(async () => {
    const module = Test.createTestingModule({
      providers: [
        HealthCheckService,
        {
          provide: HealthCheckExecutor,
          useValue: healthCheckExecutorMock,
        },
      ],
    });
    const context = await module.compile();

    healthCheckService = context.get(HealthCheckService);
    healthCheckExecutor = context.get(HealthCheckExecutor);
  });

  it('should return the result', async () => {
    (healthCheckExecutor.execute as jest.Mock).mockReturnValue({
      status: 'ok',
    });
    const result = await healthCheckService.check([() => Promise.resolve({})]);
    expect(result).toEqual({ status: 'ok' });
  });

  it('should throw a ServiceUnavailableException', async () => {
    (healthCheckExecutor.execute as jest.Mock).mockReturnValue({
      status: 'error',
    });
    try {
      await healthCheckService.check([() => Promise.resolve({})]);
    } catch (error) {
      expect((error as any).response).toEqual({ status: 'error' });
      expect((error as any).status).toBe(503);
    }
  });
});
