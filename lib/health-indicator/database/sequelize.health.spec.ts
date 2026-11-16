import { expectTypeOf } from 'vitest';
import { Test } from '@nestjs/testing';
import { ConnectionRefusedError } from 'sequelize';
import { SequelizeHealthIndicator } from './sequelize.health.js';
import { HealthIndicatorService } from '../service/health-indicator.service.js';

vi.mock('../../utils/checkPackage.util.js', () => ({
  loadPackage: vi.fn(),
}));

describe('SequelizeHealthIndicator', () => {
  it('types the code on a failed result', () => {
    type Entry = Awaited<
      ReturnType<SequelizeHealthIndicator['pingCheck']>
    >[string];
    expectTypeOf<Extract<Entry, { message: string }>['code']>().toEqualTypeOf<
      string | undefined
    >();
  });

  let sequelize: SequelizeHealthIndicator;
  const query = vi.fn();
  const connection = { query };

  beforeEach(async () => {
    query.mockReset();

    const moduleRef = await Test.createTestingModule({
      providers: [SequelizeHealthIndicator, HealthIndicatorService],
    }).compile();
    sequelize = await moduleRef.resolve(SequelizeHealthIndicator);
  });

  it('is up when the query succeeds', async () => {
    query.mockResolvedValue([]);

    const result = await sequelize.pingCheck('db', { connection });

    expect(result).toEqual({
      db: { status: 'up', responseTime: expect.any(Number) },
    });
  });

  it('adds the error code of the driver to a failed result', async () => {
    // Sequelize wraps the driver error and keeps it on `parent`
    const driverError = Object.assign(
      new Error('connect ECONNREFUSED 127.0.0.1:3306'),
      { code: 'ECONNREFUSED' },
    );
    query.mockRejectedValue(new ConnectionRefusedError(driverError as any));

    const result = await sequelize.pingCheck('db', { connection });

    expect(result).toEqual({
      db: {
        status: 'down',
        message: 'connect ECONNREFUSED 127.0.0.1:3306',
        code: 'ECONNREFUSED',
        responseTime: expect.any(Number),
      },
    });
  });
});
