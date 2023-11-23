import { Test } from '@nestjs/testing';
import { LoggerService } from '@nestjs/common';
import {
  GracefulShutdownService,
  TERMINUS_GRACEFUL_SHUTDOWN_TIMEOUT,
} from './graceful-shutdown-timeout.service';
import { TERMINUS_LOGGER } from '../health-check/logger/logger.provider';
import { sleep } from '../utils';

jest.mock('../utils', () => ({
  sleep: jest.fn(),
}));

const loggerMock: Partial<LoggerService> = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
};

describe('GracefulShutdownService', () => {
  let service: GracefulShutdownService;
  let logger: LoggerService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        GracefulShutdownService,
        { provide: TERMINUS_LOGGER, useValue: loggerMock },
        { provide: TERMINUS_GRACEFUL_SHUTDOWN_TIMEOUT, useValue: 1000 },
      ],
    }).compile();

    logger = module.get(TERMINUS_LOGGER);
    service = module.get(GracefulShutdownService);
  });

  it('should not trigger sleep if signal is not SIGTERM', async () => {
    await service.beforeApplicationShutdown('SIGINT');
    expect(sleep).not.toHaveBeenCalled();
  });

  it('should trigger sleep if signal is SIGTERM', async () => {
    await service.beforeApplicationShutdown('SIGTERM');
    expect(sleep).toHaveBeenCalledWith(1000);
  });
});
