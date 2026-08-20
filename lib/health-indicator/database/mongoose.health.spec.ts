import { type ModuleRef } from '@nestjs/core';
import { HealthIndicatorService } from '../health-indicator.service';
import { MongooseHealthIndicator } from './mongoose.health';

describe('MongooseHealthIndicator', () => {
  let mongooseHealthIndicator: MongooseHealthIndicator;

  beforeEach(() => {
    mongooseHealthIndicator = new MongooseHealthIndicator(
      { get: jest.fn() } as unknown as ModuleRef,
      new HealthIndicatorService(),
    );
  });

  describe('#pingCheck', () => {
    it('should execute a ping command against MongoDB', async () => {
      const command = jest.fn().mockResolvedValue({ ok: 1 });
      const connection = {
        readyState: 1,
        db: { command },
      };

      await expect(
        mongooseHealthIndicator.pingCheck('mongo', { connection }),
      ).resolves.toEqual({ mongo: { status: 'up' } });

      expect(command).toHaveBeenCalledTimes(1);
      expect(command).toHaveBeenCalledWith({ ping: 1 });
    });

    it('should report down when ping fails even if readyState is connected', async () => {
      const command = jest
        .fn()
        .mockRejectedValue(new Error('server selection failed'));
      const connection = {
        readyState: 1,
        db: { command },
      };

      await expect(
        mongooseHealthIndicator.pingCheck('mongo', { connection }),
      ).resolves.toEqual({ mongo: { status: 'down' } });
    });

    it('should report down when the database handle is unavailable', async () => {
      const connection = { readyState: 1 };

      await expect(
        mongooseHealthIndicator.pingCheck('mongo', { connection }),
      ).resolves.toEqual({ mongo: { status: 'down' } });
    });

    it('should report down when ping exceeds the configured timeout', async () => {
      const command = jest
        .fn()
        .mockImplementation(() => new Promise(() => undefined));
      const connection = {
        readyState: 1,
        db: { command },
      };

      await expect(
        mongooseHealthIndicator.pingCheck('mongo', {
          connection,
          timeout: 10,
        }),
      ).resolves.toEqual({
        mongo: {
          message: 'timeout of 10ms exceeded',
          status: 'down',
        },
      });
    });
  });
});
