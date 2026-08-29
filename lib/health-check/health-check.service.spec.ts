import { Test } from '@nestjs/testing';
import { HealthCheckService } from './health-check.service.js';
import { HealthCheckExecutor } from './health-check-executor.service.js';
import { ERROR_LOGGER } from './error-logger/error-logger.provider.js';
import { ErrorLogger } from './error-logger/error-logger.interface.js';
import { TERMINUS_LOGGER } from '../terminus.constants.js';
import { LoggerService } from '@nestjs/common';

const healthCheckExecutorMock: Partial<HealthCheckExecutor> = {
  execute: vi.fn(),
};

const errorLoggerMock: ErrorLogger = {
  getErrorMessage: vi.fn(),
};

const loggerMock: Partial<LoggerService> = {
  log: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
};

describe('HealthCheckService', () => {
  let healthCheckExecutor: HealthCheckExecutor;
  let healthCheckService: HealthCheckService;
  let logger: LoggerService;
  let errorLogger: ErrorLogger;

  beforeEach(async () => {
    const module = Test.createTestingModule({
      providers: [
        HealthCheckService,
        {
          provide: HealthCheckExecutor,
          useValue: healthCheckExecutorMock,
        },
        {
          provide: ERROR_LOGGER,
          useValue: errorLoggerMock,
        },
        {
          provide: TERMINUS_LOGGER,
          useValue: loggerMock,
        },
      ],
    });
    const context = await module.compile();

    healthCheckService = context.get(HealthCheckService);
    healthCheckExecutor = context.get(HealthCheckExecutor);
    logger = context.get(TERMINUS_LOGGER);
    errorLogger = context.get(ERROR_LOGGER);
  });

  it('should return the result', async () => {
    (healthCheckExecutor.execute as ReturnType<typeof vi.fn>).mockReturnValue({
      status: 'ok',
    });
    const result = await healthCheckService.check([() => Promise.resolve({})]);
    expect(result).toEqual({ status: 'ok' });
  });

  it('should throw a ServiceUnavailableException', async () => {
    (healthCheckExecutor.execute as ReturnType<typeof vi.fn>).mockReturnValue({
      status: 'error',
    });
    try {
      await healthCheckService.check([() => Promise.resolve({})]);
    } catch (error) {
      expect((error as any).response).toEqual({ status: 'error' });
      expect((error as any).status).toBe(503);
    }
  });

  it('should print an error message', async () => {
    (healthCheckExecutor.execute as ReturnType<typeof vi.fn>).mockReturnValue({
      status: 'error',
    });
    (errorLogger.getErrorMessage as ReturnType<typeof vi.fn>).mockReturnValue(
      'error message',
    );

    try {
      await healthCheckService.check([() => Promise.resolve({})]);
    } catch {
      expect(logger.error).toHaveBeenCalledWith('error message');
    }
  });
});
