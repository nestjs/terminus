import { Test } from '@nestjs/testing';
import { DrizzleHealthIndicator } from './drizzle.health.js';
import { HealthIndicatorService } from '../health-indicator.service.js';
import { loadPackage } from '../../utils/checkPackage.util.js';

vi.mock('../../utils/checkPackage.util.js', () => ({
  assertPackages: vi.fn(),
  loadPackage: vi.fn(),
}));

describe('DrizzleHealthIndicator', () => {
  let drizzle: DrizzleHealthIndicator;
  const execute = vi.fn();
  const connection = { execute };
  const getDrizzleToken = vi.fn((name?: string) =>
    name ? `${name}DrizzleDatabase` : 'DrizzleDatabase',
  );
  const sql = (strings: TemplateStringsArray) => strings.join('');

  beforeEach(async () => {
    execute.mockReset();
    getDrizzleToken.mockClear();
    vi.mocked(loadPackage).mockReset();
    vi.mocked(loadPackage).mockImplementation(async (pkg: string) => {
      if (pkg === '@nestjs/drizzle') {
        return { getDrizzleToken };
      }
      if (pkg === 'drizzle-orm') {
        return { sql };
      }
      throw new Error(`Unexpected package load: ${pkg}`);
    });

    const moduleRef = await Test.createTestingModule({
      providers: [
        DrizzleHealthIndicator,
        HealthIndicatorService,
        {
          provide: 'DrizzleDatabase',
          useValue: connection,
        },
        {
          provide: 'analyticsDrizzleDatabase',
          useValue: connection,
        },
      ],
    }).compile();

    drizzle = await moduleRef.resolve(DrizzleHealthIndicator);
  });

  it('pings the database when connection is provided directly', async () => {
    execute.mockResolvedValue([{ 1: 1 }]);

    const result = await drizzle.pingCheck('drizzle', { connection });

    expect(result).toEqual({
      drizzle: { status: 'up', responseTime: expect.any(Number) },
    });
    expect(execute).toHaveBeenCalledWith('SELECT 1');
  });

  it('pings the database when connection is resolved from moduleRef', async () => {
    execute.mockResolvedValue([{ 1: 1 }]);

    const result = await drizzle.pingCheck('drizzle');

    expect(result).toEqual({
      drizzle: { status: 'up', responseTime: expect.any(Number) },
    });
    expect(getDrizzleToken).toHaveBeenCalledWith(undefined);
    expect(execute).toHaveBeenCalledWith('SELECT 1');
  });

  it('passes connectionName to getDrizzleToken when provided', async () => {
    execute.mockResolvedValue([{ 1: 1 }]);

    const result = await drizzle.pingCheck('drizzle', {
      connectionName: 'analytics',
    });

    expect(result).toEqual({
      drizzle: { status: 'up', responseTime: expect.any(Number) },
    });
    expect(getDrizzleToken).toHaveBeenCalledWith('analytics');
    expect(execute).toHaveBeenCalledWith('SELECT 1');
  });

  it('reports down when connection is not found in application context', async () => {
    getDrizzleToken.mockReturnValueOnce('NonExistentDatabase');

    const result = await drizzle.pingCheck('drizzle');

    expect(result).toEqual({
      drizzle: {
        status: 'down',
        message: 'Connection provider not found in application context',
        responseTime: expect.any(Number),
      },
    });
    expect(execute).not.toHaveBeenCalled();
  });

  it('reports down when the ping fails', async () => {
    execute.mockRejectedValue(new Error('Connection lost'));

    const result = await drizzle.pingCheck('drizzle', { connection });

    expect(result).toEqual({
      drizzle: {
        status: 'down',
        message: 'Connection lost',
        responseTime: expect.any(Number),
      },
    });
  });

  it('reports down when the ping exceeds the timeout', async () => {
    execute.mockImplementation(() => new Promise(() => undefined));

    const result = await drizzle.pingCheck('drizzle', {
      connection,
      timeout: 10,
    });

    expect(result).toEqual({
      drizzle: {
        status: 'down',
        message: 'timeout of 10ms exceeded',
        responseTime: expect.any(Number),
      },
    });
  });

  it('lets a chained withTimeout override the deprecated timeout option', async () => {
    execute.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 5000)),
    );

    const result = await drizzle
      .pingCheck('drizzle', { connection, timeout: 10000 })
      .withTimeout(10);

    expect(result).toEqual({
      drizzle: {
        status: 'down',
        message: 'timeout of 10ms exceeded',
        responseTime: expect.any(Number),
      },
    });
  });
});
