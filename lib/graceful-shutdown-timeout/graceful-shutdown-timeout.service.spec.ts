import { Test } from '@nestjs/testing';
import { LoggerService } from '@nestjs/common';
import { GracefulShutdownService } from './graceful-shutdown-timeout.service';
import {
  TERMINUS_LOGGER,
  TERMINUS_MODULE_OPTIONS,
} from '../terminus.constants';
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

  describe('when gracefulShutdownTimeoutMs is set', () => {
    beforeEach(async () => {
      jest.clearAllMocks();
      const module = await Test.createTestingModule({
        providers: [
          GracefulShutdownService,
          { provide: TERMINUS_LOGGER, useValue: loggerMock },
          {
            provide: TERMINUS_MODULE_OPTIONS,
            useValue: { gracefulShutdownTimeoutMs: 1000 },
          },
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

    it('should log the received signal', async () => {
      await service.beforeApplicationShutdown('SIGTERM');
      expect(loggerMock.log).toHaveBeenCalledWith(
        'Received termination signal SIGTERM',
      );
    });

    it('should log the timeout duration before sleeping', async () => {
      await service.beforeApplicationShutdown('SIGTERM');
      expect(loggerMock.log).toHaveBeenCalledWith(
        'Awaiting 1000ms before shutdown',
      );
    });

    it('should log after timeout is reached', async () => {
      await service.beforeApplicationShutdown('SIGTERM');
      expect(loggerMock.log).toHaveBeenCalledWith(
        'Timeout reached, shutting down now',
      );
    });
  });

  describe('when gracefulShutdownTimeoutMs is 0', () => {
    beforeEach(async () => {
      jest.clearAllMocks();
      const module = await Test.createTestingModule({
        providers: [
          GracefulShutdownService,
          { provide: TERMINUS_LOGGER, useValue: loggerMock },
          {
            provide: TERMINUS_MODULE_OPTIONS,
            useValue: { gracefulShutdownTimeoutMs: 0 },
          },
        ],
      }).compile();

      service = module.get(GracefulShutdownService);
    });

    it('should not trigger sleep even for SIGTERM', async () => {
      await service.beforeApplicationShutdown('SIGTERM');
      expect(sleep).not.toHaveBeenCalled();
    });

    it('should not log anything', async () => {
      await service.beforeApplicationShutdown('SIGTERM');
      expect(loggerMock.log).not.toHaveBeenCalled();
    });
  });

  describe('when gracefulShutdownTimeoutMs is undefined', () => {
    beforeEach(async () => {
      jest.clearAllMocks();
      const module = await Test.createTestingModule({
        providers: [
          GracefulShutdownService,
          { provide: TERMINUS_LOGGER, useValue: loggerMock },
          {
            provide: TERMINUS_MODULE_OPTIONS,
            useValue: {},
          },
        ],
      }).compile();

      service = module.get(GracefulShutdownService);
    });

    it('should not trigger sleep when no timeout is configured', async () => {
      await service.beforeApplicationShutdown('SIGTERM');
      expect(sleep).not.toHaveBeenCalled();
    });
  });
});
