import v8 from 'node:v8';
import { expectTypeOf } from 'vitest';
import vm from 'node:vm';
import { HealthCheckAttempt } from './health-check-attempt.js';
import { HealthIndicatorService } from './health-indicator.service.js';
import { HealthIndicatorSession } from './health-indicator-session.js';
import { type HealthIndicatorResult } from './health-indicator-result.interface.js';

describe('HealthCheckAttempt', () => {
  let session: HealthIndicatorSession<'test'>;

  beforeEach(() => {
    session = new HealthIndicatorSession('test');
  });

  describe('execute', () => {
    it('should pass an AbortSignal to the callback', async () => {
      let receivedSignal: AbortSignal | undefined;
      const attempt = session.attempt(({ signal }) => {
        receivedSignal = signal;
      });
      await attempt;
      expect(receivedSignal).toBeInstanceOf(AbortSignal);
    });

    it('should return up when the function succeeds (void)', async () => {
      const attempt = session.attempt(() => {});
      const result = await attempt;
      expect(result).toEqual({
        test: { status: 'up', responseTime: expect.any(Number) },
      });
    });

    it('should return up when the async function succeeds (void)', async () => {
      const attempt = session.attempt(async () => {});
      const result = await attempt;
      expect(result).toEqual({
        test: { status: 'up', responseTime: expect.any(Number) },
      });
    });

    // FIXME: Remove this in v13, the returned value is ignored (#2796)
    it('should return up with additional data when function returns data', async () => {
      const attempt = session.attempt(() => ({ foo: 'bar' }));
      const result = await attempt;
      expect(result).toEqual({
        test: { status: 'up', foo: 'bar', responseTime: expect.any(Number) },
      });
    });

    // FIXME: Remove this in v13, the returned value is ignored (#2796)
    it('should return up with additional data when async function returns data', async () => {
      const attempt = session.attempt(async () => ({ version: '1.0' }));
      const result = await attempt;
      expect(result).toEqual({
        test: {
          status: 'up',
          version: '1.0',
          responseTime: expect.any(Number),
        },
      });
    });

    // FIXME: Rewrite in v13 to use withData(), the returned value is ignored (#2796)
    it.each(['status', 'responseTime', 'cachedResponse'])(
      'should ignore the reserved key "%s" in the returned value',
      async (key) => {
        const attempt = session.attempt(() => ({ [key]: 'foo', foo: 'bar' }));
        const result = await attempt;
        expect(result).toEqual({
          test: { status: 'up', foo: 'bar', responseTime: expect.any(Number) },
        });
      },
    );

    // FIXME: Rewrite in v13 to use withData(), the returned value is ignored (#2796)
    it('should stay up when returning an object with a circular reference and a reserved key (e.g. an axios response)', async () => {
      const response: Record<string, unknown> = { status: 200, data: 'ok' };
      response.request = { res: response };
      const result = await session.attempt(async () => response);
      expect(result.test).toMatchObject({ status: 'up', data: 'ok' });
      expect(result.test.responseTime).toEqual(expect.any(Number));
    });

    // FIXME: Rewrite in v13 to use withData(), the returned value is ignored (#2796)
    it('should warn only once per process about ignored reserved keys', async () => {
      vi.resetModules();
      const { Logger } = await import('@nestjs/common');
      const warn = vi
        .spyOn(Logger.prototype, 'warn')
        .mockImplementation(() => {});
      const { HealthIndicatorSession: FreshSession } = await import(
        './health-indicator.service.js'
      );

      await new FreshSession('a').attempt(() => ({ status: 200 }));
      await new FreshSession('b').attempt(() => ({ cachedResponse: 1 }));

      const reservedWarnings = warn.mock.calls.filter(([msg]) =>
        String(msg).includes('reserved key'),
      );
      expect(reservedWarnings).toHaveLength(1);
      expect(reservedWarnings[0][0]).toContain('"status"');
      warn.mockRestore();
    });

    it.each([null, 'ok', 42, true, [1, 2]])(
      'should ignore a non-object return value (%p)',
      async (value) => {
        const attempt = session.attempt(() => value as never);
        const result = await attempt;
        expect(result).toEqual({
          test: { status: 'up', responseTime: expect.any(Number) },
        });
      },
    );

    it('should return down when the function throws', async () => {
      const attempt = session.attempt(() => {
        throw new Error('Something broke');
      });
      const result = await attempt;
      expect(result).toEqual({
        test: {
          status: 'down',
          message: 'Something broke',
          responseTime: expect.any(Number),
        },
      });
    });

    it('should return down when the async function rejects', async () => {
      const attempt = session.attempt(async () => {
        throw new Error('Connection refused');
      });
      const result = await attempt;
      expect(result).toEqual({
        test: {
          status: 'down',
          message: 'Connection refused',
          responseTime: expect.any(Number),
        },
      });
    });

    it('should handle non-Error throws', async () => {
      const attempt = session.attempt(() => {
        throw 'string error';
      });
      const result = await attempt;
      expect(result).toEqual({
        test: {
          status: 'down',
          message: 'string error',
          responseTime: expect.any(Number),
        },
      });
    });
  });

  describe('withTimeout', () => {
    it('should return this for chaining', () => {
      const attempt = session.attempt(() => {});
      expect(attempt.withTimeout(1000)).toBe(attempt);
    });

    it('should return up when function completes within timeout', async () => {
      const attempt = session
        .attempt(
          async () => new Promise<void>((resolve) => setTimeout(resolve, 10)),
        )
        .withTimeout(1000);
      const result = await attempt;
      expect(result).toEqual({
        test: { status: 'up', responseTime: expect.any(Number) },
      });
    });

    it('should return down when function exceeds timeout', async () => {
      const attempt = session
        .attempt(
          async () => new Promise<void>((resolve) => setTimeout(resolve, 5000)),
        )
        .withTimeout(50);
      const result = await attempt;
      expect(result).toEqual({
        test: {
          status: 'down',
          message: 'timeout of 50ms exceeded',
          responseTime: expect.any(Number),
        },
      });
    });

    it.each([-1, Infinity, 2 ** 40])('should reject a timeout of %p', (ms) => {
      expect(() => session.attempt(() => {}).withTimeout(ms)).toThrow(
        'Timeout must be between 0 and 4294967295 milliseconds',
      );
    });

    // Test for https://github.com/nestjs/terminus/issues/2767
    // More info: https://github.com/nodejs/node/issues/54614
    it('should not retain memory across attempts (nodejs/node#54614)', async () => {
      v8.setFlagsFromString('--expose-gc');
      const gc: () => void = vm.runInNewContext('gc');
      const attempts = 20_000;
      const runAll = async () => {
        for (let i = 0; i < attempts; i++) {
          await session.attempt(async () => {}).withTimeout(1);
        }
        // let the AbortSignal.timeout timers fire so only real leaks remain
        await new Promise((resolve) => setTimeout(resolve, 500));
        gc();
        gc();
        return process.memoryUsage().heapUsed;
      };
      const warm = await runAll();
      const after = await runAll();
      // AbortSignal.any() retained ~2.5 KB per attempt: 20k attempts ≈ 50 MB.
      // GC noise on CI reaches ~7 MB, so allow 20 MB.
      expect(after - warm).toBeLessThan(20 * 1024 * 1024);
    });

    it('should abort the signal when timeout fires', async () => {
      let receivedSignal: AbortSignal | undefined;
      const attempt = session
        .attempt(async ({ signal }) => {
          receivedSignal = signal;
          return new Promise<void>((resolve) => setTimeout(resolve, 5000));
        })
        .withTimeout(50);
      await attempt;
      expect(receivedSignal?.aborted).toBe(true);
    });
  });
});

describe('HealthCheckAttempt withData', () => {
  let session: HealthIndicatorSession<'test'>;

  beforeEach(() => {
    session = new HealthIndicatorSession('test');
  });

  async function freshSessionWithWarnSpy() {
    vi.resetModules();
    const { Logger } = await import('@nestjs/common');
    const warn = vi
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => {});
    const { HealthIndicatorSession: FreshSession } = await import(
      './health-indicator.service.js'
    );
    const deprecationWarnings = () =>
      warn.mock.calls.filter(([msg]) => String(msg).includes('withData()'));
    return { FreshSession, warn, deprecationWarnings };
  }

  it('should return this for chaining', () => {
    const attempt = session.attempt(() => {});
    expect(attempt.withData({})).toBe(attempt);
  });

  it('should add the picked data instead of the returned value', async () => {
    const result = await session
      .attempt(() => ({ ok: 1, secret: 'shh' }))
      .withData((res) => ({ ok: res.ok }));
    expect(result).toEqual({
      test: { status: 'up', ok: 1, responseTime: expect.any(Number) },
    });
  });

  it('should add static data', async () => {
    const result = await session
      .attempt(() => ({ secret: 'shh' }))
      .withData({ owner: 'team-billing' });
    expect(result).toEqual({
      test: {
        status: 'up',
        owner: 'team-billing',
        responseTime: expect.any(Number),
      },
    });
  });

  it('should not run and not add data when the check is down', async () => {
    const pick = vi.fn(() => ({ foo: 'bar' }));
    const result = await session
      .attempt(() => {
        throw new Error('nope');
      })
      .withData(pick);
    expect(pick).not.toHaveBeenCalled();
    expect(result).toEqual({
      test: {
        status: 'down',
        message: 'nope',
        responseTime: expect.any(Number),
      },
    });
  });

  it('should await an async withData', async () => {
    const result = await session
      .attempt(() => ({ ok: 1 }))
      .withData(async (res) => ({ ok: res.ok }));
    expect(result).toEqual({
      test: { status: 'up', ok: 1, responseTime: expect.any(Number) },
    });
  });

  it('should mark the check as down when an async withData rejects or times out', async () => {
    const rejected = await session
      .attempt(() => ({}))
      .withData(async () => {
        throw new Error('pick failed');
      });
    expect(rejected.test).toMatchObject({
      status: 'down',
      message: 'pick failed',
    });

    const slow = await session
      .attempt(() => ({}))
      .withData(() => new Promise<never>(() => {}))
      .withTimeout(20);
    expect(slow.test).toMatchObject({
      status: 'down',
      message: 'timeout of 20ms exceeded',
    });
  });

  it('should mark the check as down when withData throws', async () => {
    const result = await session
      .attempt(() => ({}))
      .withData(() => {
        throw new Error('pick failed');
      });
    expect(result).toEqual({
      test: {
        status: 'down',
        message: 'pick failed',
        responseTime: expect.any(Number),
      },
    });
  });

  it.each(['status', 'responseTime', 'cachedResponse'])(
    'should ignore the reserved key "%s" returned by withData',
    async (key) => {
      const result = await session
        .attempt(() => {})
        .withData(() => ({ [key]: 'foo', foo: 'bar' }) as never);
      expect(result).toEqual({
        test: { status: 'up', foo: 'bar', responseTime: expect.any(Number) },
      });
    },
  );

  it.each([
    ['withData().withTimeout()', true],
    ['withTimeout().withData()', false],
  ])(
    'should mark as down without data on timeout (%s)',
    async (_, dataFirst) => {
      const pick = vi.fn(() => ({ foo: 'bar' }));
      const attempt = session.attempt(
        () => new Promise<void>((resolve) => setTimeout(resolve, 5000)),
      );
      if (dataFirst) {
        attempt.withData(pick).withTimeout(50);
      } else {
        attempt.withTimeout(50).withData(pick);
      }
      expect(await attempt).toEqual({
        test: {
          status: 'down',
          message: 'timeout of 50ms exceeded',
          responseTime: expect.any(Number),
        },
      });
      expect(pick).not.toHaveBeenCalled();
    },
  );

  it('should cache the picked data and not run withData on a cache hit', async () => {
    const h = new HealthIndicatorService();
    const pick = vi.fn((res: { ok: number }) => ({ ok: res.ok }));
    const fn = async () => ({ ok: 1, secret: 'shh' });
    await h.check('db').attempt(fn).withData(pick).cacheFor(1000);
    const second = await h
      .check('db')
      .attempt(fn)
      .cacheFor(1000)
      .withData(pick);
    expect(pick).toHaveBeenCalledTimes(1);
    expect(second).toEqual({
      db: {
        status: 'up',
        ok: 1,
        responseTime: expect.any(Number),
        cachedResponse: true,
      },
    });
  });

  it('should type the result with the data from withData', async () => {
    const result = await session
      .attempt(() => ({ version: '8.0', secret: 'shh' }))
      .withData((res) => ({ version: res.version }));

    if (result.test.status === 'up') {
      expectTypeOf(result.test.version).toEqualTypeOf<string>();
      expectTypeOf(result.test.responseTime).toEqualTypeOf<number>();
      // @ts-expect-error cachedResponse only exists with cacheFor()
      void result.test.cachedResponse;
      // @ts-expect-error the raw return value is not part of the result
      void result.test.secret;
    } else {
      expectTypeOf(result.test.status).toEqualTypeOf<'down'>();
      expectTypeOf(result.test.message).toEqualTypeOf<string>();
    }
  });

  it('should type the result for async and static withData', async () => {
    const asyncResult = await session
      .attempt(() => ({ ok: 1 }))
      .withData(async (res) => ({ ok: res.ok === 1 }));
    if (asyncResult.test.status === 'up') {
      expectTypeOf(asyncResult.test.ok).toEqualTypeOf<boolean>();
    }

    const staticResult = await session
      .attempt(() => {})
      .withData({ owner: 'team-billing' })
      .withTimeout(1000)
      .cacheFor(1000);
    if (staticResult.test.status === 'up') {
      expectTypeOf(staticResult.test.owner).toEqualTypeOf<'team-billing'>();
    }

    const literalResult = await session
      .attempt(() => {})
      .withData(() => ({ region: 'eu', tags: ['a', 'b'] }));
    if (literalResult.test.status === 'up') {
      expectTypeOf(literalResult.test.region).toEqualTypeOf<'eu'>();
      expectTypeOf(literalResult.test.tags).toEqualTypeOf<
        readonly ['a', 'b']
      >();
    }
  });

  it('should type cachedResponse only when cacheFor is used', async () => {
    const cached = await session
      .attempt(() => {})
      .cacheFor(1000)
      .withData({ owner: 'x' })
      .withTimeout(1000);
    expectTypeOf(cached.test.cachedResponse).toEqualTypeOf<true | undefined>();

    const uncached = await session.attempt(() => {}).withData({ owner: 'x' });
    // @ts-expect-error cachedResponse only exists with cacheFor()
    void uncached.test.cachedResponse;
  });

  it('should keep a typed attempt assignable to the untyped types', () => {
    const attempt = session.attempt(() => {}).withData({ owner: 'x' });
    expectTypeOf(attempt).toExtend<HealthCheckAttempt<'test'>>();
    expectTypeOf(attempt.cacheFor(1000)).toExtend<HealthCheckAttempt<'test'>>();
    expectTypeOf(attempt).toExtend<
      PromiseLike<HealthIndicatorResult<'test'>>
    >();
  });

  it('should infer the result type from the attempt function', () => {
    session
      .attempt(async () => ({ ok: 1 as const }))
      .withData((res) => {
        expectTypeOf(res).toEqualTypeOf<{ ok: 1 }>();
        return {};
      });
    interface ServerInfo {
      version: string;
    }
    const info = {
      ok: true as boolean,
      server: { version: '1' } as ServerInfo,
    };
    // unions and interfaces are allowed
    session
      .attempt(() => info)
      .withData((res) => (res.ok ? { ok: true } : { ok: false, reason: 'x' }));
    session.attempt(() => info).withData((res) => res.server);
    session.attempt(() => info).withData(async (res) => res.server);
    const pickReserved = (res: typeof info) =>
      res.ok ? { ok: true } : { status: 'x' };
    // @ts-expect-error reserved keys are not allowed in any branch of a union
    session.attempt(() => info).withData(pickReserved);
    // @ts-expect-error arrays are not allowed
    session.attempt(() => [1]).withData((res) => res);
    // @ts-expect-error primitives are not allowed
    session.attempt(() => 1).withData((res) => res);
    // @ts-expect-error reserved keys are not allowed
    session.attempt(() => {}).withData({ status: 'up' });
    // @ts-expect-error reserved keys are not allowed
    session.attempt(() => {}).withData(() => ({ responseTime: 1 }));
    // @ts-expect-error reserved keys are not allowed
    session.attempt(() => {}).withData(async () => ({ cachedResponse: 1 }));
  });

  // FIXME: Remove this in v13, the returned value is ignored (#2796)
  it('should log a deprecation warning once when data is returned without withData', async () => {
    const { FreshSession, deprecationWarnings } =
      await freshSessionWithWarnSpy();

    const first = await new FreshSession('a').attempt(() => ({ ok: 1 }));
    await new FreshSession('b').attempt(() => ({ ok: 1 }));

    // v12: the returned value is still merged
    expect(first.a).toMatchObject({ status: 'up', ok: 1 });
    expect(deprecationWarnings()).toHaveLength(1);
    expect(deprecationWarnings()[0][0]).toContain('"a"');
    vi.restoreAllMocks();
  });

  it.each([
    ['void', () => {}],
    ['an empty object', () => ({})],
    ['a non-object', () => 'ok' as never],
  ])(
    'should not log a deprecation warning when returning %s',
    async (_, fn) => {
      const { FreshSession, deprecationWarnings } =
        await freshSessionWithWarnSpy();
      await new FreshSession('a').attempt(fn);
      expect(deprecationWarnings()).toHaveLength(0);
      vi.restoreAllMocks();
    },
  );

  // FIXME: Remove this in v13, the returned value is ignored (#2796)
  it('should not log a deprecation warning when withData is used', async () => {
    const { FreshSession, deprecationWarnings } =
      await freshSessionWithWarnSpy();
    await new FreshSession('a').attempt(() => ({ ok: 1 })).withData({});
    expect(deprecationWarnings()).toHaveLength(0);
    vi.restoreAllMocks();
  });
});

describe('HealthCheckAttempt cacheFor', () => {
  let h: HealthIndicatorService;

  beforeEach(() => {
    h = new HealthIndicatorService();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return the cached result within the TTL without re-running', async () => {
    const fn = vi.fn(async () => {});
    const first = await h.check('db').attempt(fn).cacheFor(1000);
    const second = await h.check('db').attempt(fn).cacheFor(1000);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(second).toEqual({
      db: {
        status: 'up',
        responseTime: expect.any(Number),
        cachedResponse: true,
      },
    });
    expect(first).toEqual({
      db: { status: 'up', responseTime: expect.any(Number) },
    });
  });

  it('should re-run after the TTL expired', async () => {
    vi.useFakeTimers();
    const fn = vi.fn(async () => {});
    await h.check('db').attempt(fn).cacheFor(1000);
    vi.setSystemTime(Date.now() + 1001);
    await h.check('db').attempt(fn).cacheFor(1000);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should cache down results', async () => {
    const fn = vi.fn(async () => {
      throw new Error('nope');
    });
    await h.check('db').attempt(fn).cacheFor(1000);
    const second = await h.check('db').attempt(fn).cacheFor(1000);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(second).toEqual({
      db: {
        status: 'down',
        message: 'nope',
        responseTime: expect.any(Number),
        cachedResponse: true,
      },
    });
  });

  it('should share a single in-flight run between concurrent executions', async () => {
    const fn = vi.fn(async () => {});
    const [first, second] = await Promise.all([
      h.check('db').attempt(fn).cacheFor(1000),
      h.check('db').attempt(fn).cacheFor(1000),
    ]);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(second).toEqual(first);
  });

  it('should abandon a hung run after the TTL instead of joining it forever', async () => {
    vi.useFakeTimers();
    const hung = vi.fn(() => new Promise<void>(() => {}));
    void h.check('db').attempt(hung).cacheFor(1000).then();
    vi.setSystemTime(Date.now() + 1001);
    const fn = vi.fn(async () => {});
    const result = await h.check('db').attempt(fn).cacheFor(1000);
    expect(hung).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      db: { status: 'up', responseTime: expect.any(Number) },
    });
  });

  it('should not share the cache between different keys', async () => {
    const fn = vi.fn(async () => {});
    await h.check('a').attempt(fn).cacheFor(1000);
    await h.check('b').attempt(fn).cacheFor(1000);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should not cache without cacheFor', async () => {
    const fn = vi.fn(async () => {});
    await h.check('db').attempt(fn);
    await h.check('db').attempt(fn);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it.each([-1, Infinity, 2 ** 40])('should reject a TTL of %p', (ms) => {
    expect(() =>
      new HealthIndicatorService()
        .check('db')
        .attempt(() => {})
        .cacheFor(ms),
    ).toThrow('Cache TTL must be between 0 and 4294967295 milliseconds');
  });
});
