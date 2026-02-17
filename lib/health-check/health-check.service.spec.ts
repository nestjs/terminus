import { Test } from '@nestjs/testing';
import { HealthCheckService } from './health-check.service';
import { HealthCheckExecutor } from './health-check-executor.service';
import { ERROR_LOGGER } from './error-logger/error-logger.provider';
import { ErrorLogger } from './error-logger/error-logger.interface';
import { TERMINUS_LOGGER } from '../terminus.constants';
import { LoggerService } from '@nestjs/common';

const healthCheckExecutorMock: Partial<HealthCheckExecutor> = {
  execute: jest.fn(),
};

const errorLoggerMock: ErrorLogger = {
  getErrorMessage: jest.fn(),
};

const loggerMock: Partial<LoggerService> = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
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

  it('should print an error message', async () => {
    (healthCheckExecutor.execute as jest.Mock).mockReturnValue({
      status: 'error',
    });
    (errorLogger.getErrorMessage as jest.Mock).mockReturnValue('error message');

    try {
      await healthCheckService.check([() => Promise.resolve({})]);
    } catch (error) {
      expect(logger.error).toHaveBeenCalledWith('error message');
    }
  });
});
