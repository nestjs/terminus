import { Test } from '@nestjs/testing';
import { LoggerService } from '@nestjs/common';
import {
  GracefulShutdownService,
  TERMINUS_GRACEFUL_SHUTDOWN_TIMEOUT,
  TERMINUS_ENABLE_ENHANCED_SHUTDOWN,
  TERMINUS_BEFORE_SHUTDOWN_DELAY,
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

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Standard graceful shutdown', () => {
    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [
          GracefulShutdownService,
          { provide: TERMINUS_LOGGER, useValue: loggerMock },
          { provide: TERMINUS_GRACEFUL_SHUTDOWN_TIMEOUT, useValue: 1000 },
          { provide: TERMINUS_ENABLE_ENHANCED_SHUTDOWN, useValue: false },
          { provide: TERMINUS_BEFORE_SHUTDOWN_DELAY, useValue: 15000 },
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

    it('should not be shutting down initially', () => {
      expect(service.isApplicationShuttingDown()).toBe(false);
    });
  });

  describe('Enhanced graceful shutdown', () => {
    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [
          GracefulShutdownService,
          { provide: TERMINUS_LOGGER, useValue: loggerMock },
          { provide: TERMINUS_GRACEFUL_SHUTDOWN_TIMEOUT, useValue: 5000 },
          { provide: TERMINUS_ENABLE_ENHANCED_SHUTDOWN, useValue: true },
          { provide: TERMINUS_BEFORE_SHUTDOWN_DELAY, useValue: 10000 },
        ],
      }).compile();

      logger = module.get(TERMINUS_LOGGER);
      service = module.get(GracefulShutdownService);
    });

    it('should perform enhanced shutdown sequence', async () => {
      expect(service.isApplicationShuttingDown()).toBe(false);

      await service.beforeApplicationShutdown('SIGTERM');

      // Should wait for both delays
      expect(sleep).toHaveBeenCalledTimes(2);
      expect(sleep).toHaveBeenNthCalledWith(1, 10000); // beforeShutdownDelayMs
      expect(sleep).toHaveBeenNthCalledWith(2, 5000); // gracefulShutdownTimeoutMs
    });

    it('should mark application as shutting down during enhanced shutdown', async () => {
      const shutdownPromise = service.beforeApplicationShutdown('SIGTERM');

      // After starting shutdown, should be marked as shutting down
      expect(service.isApplicationShuttingDown()).toBe(true);

      await shutdownPromise;
    });

    it('should log appropriate messages during enhanced shutdown', async () => {
      await service.beforeApplicationShutdown('SIGTERM');

      expect(loggerMock.log).toHaveBeenCalledWith(
        'Received termination signal SIGTERM',
      );
      expect(loggerMock.log).toHaveBeenCalledWith(
        'Enhanced graceful shutdown initiated - marking readiness probe as unhealthy',
      );
      expect(loggerMock.log).toHaveBeenCalledWith(
        'Waiting 10000ms for load balancer to stop routing traffic',
      );
      expect(loggerMock.log).toHaveBeenCalledWith(
        'Processing remaining requests for up to 5000ms',
      );
      expect(loggerMock.log).toHaveBeenCalledWith(
        'Enhanced graceful shutdown complete, terminating application',
      );
    });

    it('should skip beforeShutdownDelayMs if set to 0', async () => {
      const module = await Test.createTestingModule({
        providers: [
          GracefulShutdownService,
          { provide: TERMINUS_LOGGER, useValue: loggerMock },
          { provide: TERMINUS_GRACEFUL_SHUTDOWN_TIMEOUT, useValue: 5000 },
          { provide: TERMINUS_ENABLE_ENHANCED_SHUTDOWN, useValue: true },
          { provide: TERMINUS_BEFORE_SHUTDOWN_DELAY, useValue: 0 },
        ],
      }).compile();

      service = module.get(GracefulShutdownService);

      await service.beforeApplicationShutdown('SIGTERM');

      // Should only wait for gracefulShutdownTimeoutMs
      expect(sleep).toHaveBeenCalledTimes(1);
      expect(sleep).toHaveBeenCalledWith(5000);
    });
  });
});
