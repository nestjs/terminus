import { Test } from '@nestjs/testing';
import { MikroOrmHealthIndicator } from './mikro-orm.health.js';
import { HealthIndicatorService } from '../service/health-indicator.service.js';

vi.mock('../../utils/checkPackage.util.js', () => ({
  loadPackage: vi.fn().mockResolvedValue({
    MikroORM: class MikroORM {},
  }),
}));

describe('MikroOrmHealthIndicator', () => {
  let mikroOrm: MikroOrmHealthIndicator;
  const isConnected = vi.fn();
  const connection = { isConnected };

  beforeEach(async () => {
    isConnected.mockReset();
    isConnected.mockResolvedValue(true);

    const moduleRef = await Test.createTestingModule({
      providers: [MikroOrmHealthIndicator, HealthIndicatorService],
    }).compile();
    mikroOrm = await moduleRef.resolve(MikroOrmHealthIndicator);
  });

  it('pings the database when connected', async () => {
    const result = await mikroOrm.pingCheck('db', { connection });

    expect(result).toEqual({
      db: { status: 'up', responseTime: expect.any(Number) },
    });
    expect(isConnected).toHaveBeenCalledTimes(1);
  });

  it('reports down when MikroORM is not in the context', async () => {
    const result = await mikroOrm.pingCheck('db');

    expect(result).toEqual({
      db: {
        status: 'down',
        message: 'Connection provider not found in application context',
        responseTime: expect.any(Number),
      },
    });
  });
});
