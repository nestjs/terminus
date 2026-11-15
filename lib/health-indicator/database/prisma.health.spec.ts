import { Test } from '@nestjs/testing';
import { PrismaHealthIndicator } from './prisma.health.js';
import { HealthIndicatorService } from '../service/health-indicator.service.js';

describe('PrismaHealthIndicator', () => {
  let prisma: PrismaHealthIndicator;
  // A SQL client: the MongoDB command fails, so the raw query is used
  const client = {
    $runCommandRaw: vi.fn(),
    $queryRawUnsafe: vi.fn(),
  };

  beforeEach(async () => {
    client.$runCommandRaw
      .mockReset()
      .mockRejectedValue(new Error('Use the mongodb provider'));
    client.$queryRawUnsafe.mockReset();

    const moduleRef = await Test.createTestingModule({
      providers: [PrismaHealthIndicator, HealthIndicatorService],
    }).compile();
    prisma = await moduleRef.resolve(PrismaHealthIndicator);
  });

  it('is up when the raw query succeeds', async () => {
    client.$queryRawUnsafe.mockResolvedValue([{ 1: 1 }]);

    const result = await prisma.pingCheck('db', client as any);

    expect(result).toEqual({
      db: { status: 'up', responseTime: expect.any(Number) },
    });
  });

  it('adds the Prisma error code to a failed result', async () => {
    client.$queryRawUnsafe.mockRejectedValue(
      Object.assign(new Error('Raw query failed'), { code: 'P2010' }),
    );

    const result = await prisma.pingCheck('db', client as any);

    expect(result).toEqual({
      db: {
        status: 'down',
        message: 'Raw query failed',
        code: 'P2010',
        responseTime: expect.any(Number),
      },
    });
  });
});
