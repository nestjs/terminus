import { Test } from '@nestjs/testing';
import { TypeOrmHealthIndicator } from './typeorm.health.js';
import { HealthIndicatorService } from '../service/health-indicator.service.js';

vi.mock('../../utils/checkPackage.util.js', () => ({
  loadPackage: vi.fn(),
}));

describe('TypeOrmHealthIndicator', () => {
  let typeorm: TypeOrmHealthIndicator;
  const query = vi.fn();
  const connection = { options: { type: 'mysql' }, query };

  beforeEach(async () => {
    query.mockReset();

    const moduleRef = await Test.createTestingModule({
      providers: [TypeOrmHealthIndicator, HealthIndicatorService],
    }).compile();
    typeorm = await moduleRef.resolve(TypeOrmHealthIndicator);
  });

  it('is up when the query succeeds', async () => {
    query.mockResolvedValue([]);

    const result = await typeorm.pingCheck('db', { connection });

    expect(result).toEqual({
      db: { status: 'up', responseTime: expect.any(Number) },
    });
  });

  it('adds the error code of the driver to a failed result', async () => {
    // The error of mysql2 when the database does not accept connections
    query.mockRejectedValue(
      Object.assign(new Error('connect ECONNREFUSED 127.0.0.1:3306'), {
        code: 'ECONNREFUSED',
      }),
    );

    const result = await typeorm.pingCheck('db', { connection });

    expect(result).toEqual({
      db: {
        status: 'down',
        message: 'connect ECONNREFUSED 127.0.0.1:3306',
        code: 'ECONNREFUSED',
        responseTime: expect.any(Number),
      },
    });
  });

  it('adds no code when the error has none', async () => {
    query.mockRejectedValue(new Error('nope'));

    const result = await typeorm.pingCheck('db', { connection });

    expect(result).toEqual({
      db: { status: 'down', message: 'nope', responseTime: expect.any(Number) },
    });
  });
});
