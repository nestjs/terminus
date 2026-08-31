import { Test } from '@nestjs/testing';
import { MongooseHealthIndicator } from './mongoose.health.js';
import { HealthIndicatorService } from '../health-indicator.service.js';
import { DATABASE_NOT_CONNECTED } from '../../errors/messages.constant.js';

vi.mock('../../utils/checkPackage.util.js', () => ({
  assertPackages: vi.fn(),
  loadPackage: vi.fn(),
}));

describe('MongooseHealthIndicator', () => {
  let mongoose: MongooseHealthIndicator;
  const command = vi.fn();
  const connection = { readyState: 1, db: { command } };

  beforeEach(async () => {
    command.mockReset();
    connection.readyState = 1;

    const moduleRef = await Test.createTestingModule({
      providers: [MongooseHealthIndicator, HealthIndicatorService],
    }).compile();
    mongoose = await moduleRef.resolve(MongooseHealthIndicator);
  });

  it('pings the database when connected', async () => {
    command.mockResolvedValue({ ok: 1 });

    const result = await mongoose.pingCheck('mongo', { connection });

    expect(result).toEqual({
      mongo: { status: 'up', responseTime: expect.any(Number) },
    });
    expect(command).toHaveBeenCalledWith({ ping: 1 });
  });

  it('reports down when the ping fails although readyState is connected', async () => {
    command.mockRejectedValue(new Error('server selection failed'));

    const result = await mongoose.pingCheck('mongo', { connection });

    expect(result).toEqual({
      mongo: {
        status: 'down',
        message: 'server selection failed',
        responseTime: expect.any(Number),
      },
    });
  });

  it('reports down without pinging when not connected', async () => {
    connection.readyState = 0;

    const result = await mongoose.pingCheck('mongo', { connection });

    expect(result).toEqual({
      mongo: {
        status: 'down',
        message: DATABASE_NOT_CONNECTED,
        responseTime: expect.any(Number),
      },
    });
    expect(command).not.toHaveBeenCalled();
  });

  it('lets a chained withTimeout override the deprecated timeout option', async () => {
    connection.db.command = vi.fn(
      () => new Promise((resolve) => setTimeout(resolve, 5000)),
    );

    const result = await mongoose
      .pingCheck('mongo', { connection, timeout: 10000 })
      .withTimeout(10);

    expect(result).toEqual({
      mongo: {
        status: 'down',
        message: 'timeout of 10ms exceeded',
        responseTime: expect.any(Number),
      },
    });
  });

  it('reports down when the ping exceeds the timeout', async () => {
    command.mockImplementation(() => new Promise(() => undefined));

    const result = await mongoose.pingCheck('mongo', {
      connection,
      timeout: 10,
    });

    expect(result).toEqual({
      mongo: {
        status: 'down',
        message: 'timeout of 10ms exceeded',
        responseTime: expect.any(Number),
      },
    });
  });
});
