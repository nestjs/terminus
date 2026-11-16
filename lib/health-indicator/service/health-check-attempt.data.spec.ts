import { setTimeout as sleep } from 'node:timers/promises';
import { Controller, Get, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { HealthIndicatorService } from './health-indicator.service.js';
import { HealthIndicatorSession } from './health-indicator-session.js';
import { HealthCheck, HealthCheckService } from '../../health-check/index.js';
import { TerminusModule } from '../../terminus.module.js';

// That each data method reaches the result. The rules of the data itself
// (merging, reserved keys, warnings, failing functions) are tested in
// `attempt-data.spec.ts`.

class PaymentError extends Error {
  constructor(public readonly code: string) {
    super(`payment failed: ${code}`);
  }
}

const fail = () => {
  throw new PaymentError('EPAY');
};

describe('HealthCheckAttempt data', () => {
  let session: HealthIndicatorSession<'test'>;

  beforeEach(() => {
    session = new HealthIndicatorSession('test');
  });

  const owner = { owner: 'team-billing', runbook: 'https://runbook' };

  it('should add the static data to up, degraded and down results', async () => {
    const up = await session.attempt(() => {}).withData(owner);
    expect(up.test).toEqual({
      status: 'up',
      ...owner,
      responseTime: expect.any(Number),
    });

    const slow = await session
      .attempt(() => sleep(20))
      .withData(owner)
      .degradedAfter(5);
    expect(slow.test).toMatchObject({ status: 'degraded', ...owner });

    const down = await session.attempt(fail).withData(owner);
    expect(down.test).toEqual({
      status: 'down',
      message: 'payment failed: EPAY',
      ...owner,
      responseTime: expect.any(Number),
    });

    const degraded = await session
      .attempt(fail)
      .withData(owner)
      .degradedOnFailure();
    expect(degraded.test).toEqual({
      status: 'degraded',
      message: 'payment failed: EPAY',
      ...owner,
      responseTime: expect.any(Number),
    });
  });

  it('should add the success data picked from the result, not the result', async () => {
    const result = await session
      .attempt(() => ({ ok: 1, secret: 'shh' }))
      .withSuccessData((res) => ({ ok: res.ok }));
    expect(result).toEqual({
      test: { status: 'up', ok: 1, responseTime: expect.any(Number) },
    });
  });

  it.each([
    [
      'throws',
      () => {
        throw new Error('pick failed');
      },
      'pick failed',
    ],
    [
      'rejects',
      async () => {
        throw new Error('pick failed');
      },
      'pick failed',
    ],
    [
      'times out',
      () => new Promise<never>(() => {}),
      'timeout of 20ms exceeded',
    ],
  ])(
    'should mark the check as down when the success data function %s',
    async (_, pick, message) => {
      const result = await session
        .attempt(() => ({}))
        .withSuccessData(pick)
        .withTimeout(20);
      expect(result).toEqual({
        test: { status: 'down', message, responseTime: expect.any(Number) },
      });
    },
  );

  it('should add the failure data picked from the error next to the message, also when degraded', async () => {
    const success = vi.fn(() => ({ ok: true }));
    const pick = (error: unknown) => ({ code: (error as PaymentError).code });
    const down = await session
      .attempt(fail)
      .withSuccessData(success)
      .withFailureData(pick);
    expect(down.test).toEqual({
      status: 'down',
      message: 'payment failed: EPAY',
      code: 'EPAY',
      responseTime: expect.any(Number),
    });
    expect(success).not.toHaveBeenCalled();

    const degraded = await session
      .attempt(fail)
      .degradedOnFailure()
      .withFailureData(pick);
    expect(degraded.test).toMatchObject({ status: 'degraded', code: 'EPAY' });
  });

  it('should leave out keys whose value is undefined', async () => {
    const down = await session
      .attempt(() => {
        throw new Error('no code');
      })
      .withFailureData((error) => ({ code: (error as PaymentError).code }));
    expect(down.test).toStrictEqual({
      status: 'down',
      message: 'no code',
      responseTime: expect.any(Number),
    });

    // `undefined` still replaces the static data, as in the JSON response
    const up = await session
      .attempt(() => {})
      .withData({ region: 'eu' })
      .withSuccessData(() => ({ region: undefined }));
    expect(up.test).toStrictEqual({
      status: 'up',
      responseTime: expect.any(Number),
    });
  });

  it('should let the failure data replace the error message', async () => {
    const result = await session
      .attempt(fail)
      .withData({ message: 'static' })
      .withFailureData(() => ({ message: 'Payments are not reachable' }));

    expect(result.test).toEqual({
      status: 'down',
      message: 'Payments are not reachable',
      responseTime: expect.any(Number),
    });

    // Without failure data, the message of the error wins over static data
    const plain = await session.attempt(fail).withData({ message: 'static' });
    expect(plain.test.message).toBe('payment failed: EPAY');
  });

  it.each([
    ['withData().withSuccessData()', () => {}, true],
    ['withSuccessData().withData()', () => {}, false],
    ['withData().withFailureData()', fail, true],
    ['withFailureData().withData()', fail, false],
  ])(
    'should let the success or failure data win over the static data (%s)',
    async (_, fn, staticFirst) => {
      const attempt = session.attempt(fn);
      const addStatic = () => attempt.withData({ region: 'eu', owner: 'x' });
      const addOwn = () =>
        attempt
          .withSuccessData({ region: 'us' })
          .withFailureData({ region: 'us' });
      if (staticFirst) {
        addStatic();
        addOwn();
      } else {
        addOwn();
        addStatic();
      }
      expect((await attempt).test).toMatchObject({
        region: 'us',
        owner: 'x',
      });
    },
  );

  it.each([
    ['before', true],
    ['after', false],
  ])(
    'should not depend on the builder order (withFailureData %s the others)',
    async (_, first) => {
      const attempt = session.attempt(() => sleep(5000));
      const pick = (error: unknown) => ({ reason: (error as Error).message });
      if (first) {
        attempt.withFailureData(pick).withTimeout(20).degradedOnFailure();
      } else {
        attempt.withTimeout(20).degradedOnFailure().withFailureData(pick);
      }
      expect((await attempt).test).toEqual({
        status: 'degraded',
        message: 'timeout of 20ms exceeded',
        reason: 'timeout of 20ms exceeded',
        responseTime: expect.any(Number),
      });
    },
  );

  describe('with cacheFor', () => {
    let h: HealthIndicatorService;

    beforeEach(() => {
      h = new HealthIndicatorService();
    });

    it('should cache the merged success data and not run the functions on a cache hit', async () => {
      const fn = vi.fn(async () => ({ a: 1, secret: 'shh' }));
      const pick = vi.fn((res: { a: number }) => ({ a: res.a }));
      await h
        .check('db')
        .attempt(fn)
        .withSuccessData(pick)
        .withSuccessData({ b: 2 })
        .cacheFor(1000);
      const second = await h
        .check('db')
        .attempt(fn)
        .cacheFor(1000)
        .withSuccessData(pick);
      expect(fn).toHaveBeenCalledTimes(1);
      expect(pick).toHaveBeenCalledTimes(1);
      expect(second.db).toEqual({
        status: 'up',
        a: 1,
        b: 2,
        responseTime: expect.any(Number),
        cachedResponse: true,
      });
    });

    it('should cache the failure data and not run the function on a cache hit', async () => {
      const fn = vi.fn(fail);
      const pick = vi.fn((error: unknown) => ({
        code: (error as PaymentError).code,
      }));
      await h.check('db').attempt(fn).withFailureData(pick).cacheFor(1000);
      const second = await h
        .check('db')
        .attempt(fn)
        .withFailureData(() => ({ code: 'other' }))
        .degradedOnFailure()
        .cacheFor(1000);
      expect(fn).toHaveBeenCalledTimes(1);
      expect(pick).toHaveBeenCalledTimes(1);
      // Like the success data, the data of the attempt that ran is cached
      expect(second.db).toEqual({
        status: 'degraded',
        message: 'payment failed: EPAY',
        code: 'EPAY',
        responseTime: expect.any(Number),
        cachedResponse: true,
      });
    });

    it('should apply the static data of each attempt, even from the cache', async () => {
      const fn = vi.fn(fail);
      await h.check('db').attempt(fn).withData({ owner: 'a' }).cacheFor(1000);
      const second = await h
        .check('db')
        .attempt(fn)
        .withData({ owner: 'b' })
        .cacheFor(1000);
      const third = await h.check('db').attempt(fn).cacheFor(1000);
      expect(fn).toHaveBeenCalledTimes(1);
      expect(second.db).toMatchObject({ owner: 'b', cachedResponse: true });
      expect(third.db).not.toHaveProperty('owner');
    });
  });
});

describe('HealthCheckAttempt data in a Nest app', () => {
  let app: INestApplication;

  @Controller()
  class HealthController {
    constructor(
      private readonly health: HealthCheckService,
      private readonly indicator: HealthIndicatorService,
    ) {}

    private payments() {
      return this.indicator
        .check('payments')
        .attempt(fail)
        .withData({ owner: 'team-billing' })
        .withFailureData((error) => ({ code: (error as PaymentError).code }));
    }

    @Get('down')
    @HealthCheck()
    down() {
      return this.health.check([() => this.payments()]);
    }

    @Get('degraded')
    @HealthCheck()
    degraded() {
      return this.health.check([() => this.payments().degradedOnFailure()]);
    }
  }

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [TerminusModule.forRoot({ logger: false })],
      controllers: [HealthController],
    }).compile();
    app = moduleRef.createNestApplication({ logger: false });
    await app.init();
  });

  afterEach(async () => await app.close());

  it('should respond 503 with the failure data of a failed check', async () => {
    const payments = {
      status: 'down',
      message: 'payment failed: EPAY',
      owner: 'team-billing',
      code: 'EPAY',
      responseTime: expect.any(Number),
    };
    const response = await request(app.getHttpServer()).get('/down');
    expect(response.status).toBe(503);
    expect(response.body).toEqual({
      status: 'error',
      info: {},
      error: { payments },
      details: { payments },
    });
  });

  it('should respond 200 with the failure data of a check degraded on failure', async () => {
    const payments = {
      status: 'degraded',
      message: 'payment failed: EPAY',
      owner: 'team-billing',
      code: 'EPAY',
      responseTime: expect.any(Number),
    };
    const response = await request(app.getHttpServer()).get('/degraded');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: 'degraded',
      info: { payments },
      error: {},
      details: { payments },
    });
  });
});
