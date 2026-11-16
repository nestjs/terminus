import { setTimeout as sleep } from 'node:timers/promises';
import v8 from 'node:v8';
import vm from 'node:vm';
import { HealthIndicatorService } from './health-indicator.service.js';
import { HealthIndicatorSession } from './health-indicator-session.js';
import { HealthCheckExecutor } from '../../health-check/health-check-executor.service.js';

// The data methods are tested in `health-check-attempt.data.spec.ts` and
// `attempt-data.spec.ts`, the types in `health-check-attempt.types.spec.ts`.

class PaymentError extends Error {
  constructor(public readonly code: string) {
    super(`payment failed: ${code}`);
  }
}

const fail = () => {
  throw new PaymentError('EPAY');
};

describe('HealthCheckAttempt', () => {
  let session: HealthIndicatorSession<'test'>;

  beforeEach(() => {
    session = new HealthIndicatorSession('test');
  });

  it.each([
    'withTimeout',
    'cacheFor',
    'degradedAfter',
    'degradedOnFailure',
    'withData',
    'withSuccessData',
    'withFailureData',
  ] as const)('should return this from %s for chaining', (method) => {
    const attempt = session.attempt(() => {});
    const builder = attempt[method] as (arg: object | number) => unknown;
    const arg = method.endsWith('Data') ? {} : 100;
    expect(builder.call(attempt, arg)).toBe(attempt);
  });

  it.each([
    ['withTimeout', 'Timeout'],
    ['cacheFor', 'Cache TTL'],
    ['degradedAfter', 'Degraded threshold'],
  ] as const)('should reject an invalid duration in %s', (method, name) => {
    for (const ms of [-1, Infinity, 2 ** 40, NaN, 1.5]) {
      expect(() => session.attempt(() => {})[method](ms)).toThrow(
        `${name} must be a whole number between 0 and 4294967295 milliseconds, got ${ms}`,
      );
    }
  });

  it.each([
    ['withTimeout', 'Timeout'],
    ['cacheFor', 'Cache TTL'],
    ['degradedAfter', 'Degraded threshold'],
  ] as const)(
    'should reject an invalid duration string in %s',
    (method, name) => {
      expect(() => session.attempt(() => {})[method]('2S' as '2s')).toThrow(
        `${name}: Invalid duration "2S".`,
      );
      expect(() => session.attempt(() => {})[method]('50w')).toThrow(
        `${name} must be a whole number between 0 and 4294967295 milliseconds, got 30240000000`,
      );
    },
  );

  describe('execute', () => {
    it('should pass an AbortSignal to the callback', async () => {
      let receivedSignal: AbortSignal | undefined;
      await session.attempt(({ signal }) => {
        receivedSignal = signal;
      });
      expect(receivedSignal).toBeInstanceOf(AbortSignal);
    });

    it.each([
      ['sync', () => {}],
      ['async', async () => {}],
    ])('should return up when the %s function succeeds', async (_, fn) => {
      expect(await session.attempt(fn)).toEqual({
        test: { status: 'up', responseTime: expect.any(Number) },
      });
    });

    // FIXME: Remove this in v13, the returned value is ignored (#2796)
    it.each<[string, () => unknown]>([
      ['sync', () => ({ foo: 'bar' })],
      ['async', async () => ({ foo: 'bar' })],
    ])(
      'should return up with the data returned by the %s function',
      async (_, fn) => {
        expect(await session.attempt(fn)).toEqual({
          test: { status: 'up', foo: 'bar', responseTime: expect.any(Number) },
        });
      },
    );

    it.each([
      [
        'throws',
        () => {
          throw new Error('Something broke');
        },
        'Something broke',
      ],
      [
        'rejects',
        async () => {
          throw new Error('Connection refused');
        },
        'Connection refused',
      ],
      [
        'throws a non-Error',
        () => {
          throw 'string error';
        },
        'string error',
      ],
    ])('should return down when the function %s', async (_, fn, message) => {
      expect(await session.attempt(fn)).toEqual({
        test: { status: 'down', message, responseTime: expect.any(Number) },
      });
    });
  });

  describe('withTimeout', () => {
    it('should return up when function completes within timeout', async () => {
      const result = await session.attempt(() => sleep(10)).withTimeout(1000);
      expect(result).toEqual({
        test: { status: 'up', responseTime: expect.any(Number) },
      });
    });

    it('should return down and abort the signal when the timeout fires', async () => {
      let receivedSignal: AbortSignal | undefined;
      const result = await session
        .attempt(async ({ signal }) => {
          receivedSignal = signal;
          await sleep(5000);
        })
        .withTimeout(50);
      expect(result).toEqual({
        test: {
          status: 'down',
          message: 'timeout of 50ms exceeded',
          responseTime: expect.any(Number),
        },
      });
      expect(receivedSignal?.aborted).toBe(true);
    });

    it('should accept a duration string', async () => {
      const result = await session
        .attempt(() => sleep(5000))
        .withTimeout('50ms');
      expect(result.test).toMatchObject({
        status: 'down',
        message: 'timeout of 50ms exceeded',
      });
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
        await sleep(500);
        gc();
        gc();
        return process.memoryUsage().heapUsed;
      };
      const warm = await runAll();
      const after = await runAll();
      // AbortSignal.any() retained ~2.5 KB per attempt: 20k attempts ≈ 50 MB.
      // GC noise on CI reaches ~7 MB, so allow 20 MB.
      expect(after - warm).toBeLessThan(20 * 1024 * 1024);
      // 40k attempts and two GC runs: close to the default 5s on a slow CI runner
    }, 30_000);
  });

  describe('cacheFor', () => {
    let h: HealthIndicatorService;

    beforeEach(() => {
      h = new HealthIndicatorService();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should accept a duration string', async () => {
      const fn = vi.fn(async () => {});
      await h.check('db').attempt(fn).cacheFor('1s');
      const second = await h.check('db').attempt(fn).cacheFor('1s');
      expect(fn).toHaveBeenCalledTimes(1);
      expect(second.db.cachedResponse).toBe(true);
    });

    it('should return the cached result within the TTL without re-running', async () => {
      const fn = vi.fn(async () => {});
      const first = await h.check('db').attempt(fn).cacheFor(1000);
      const second = await h.check('db').attempt(fn).cacheFor(1000);
      expect(fn).toHaveBeenCalledTimes(1);
      expect(first).toEqual({
        db: { status: 'up', responseTime: expect.any(Number) },
      });
      expect(second).toEqual({
        db: {
          status: 'up',
          responseTime: expect.any(Number),
          cachedResponse: true,
        },
      });
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

    it('should re-run after the TTL expired', async () => {
      vi.useFakeTimers();
      const fn = vi.fn(async () => {});
      await h.check('db').attempt(fn).cacheFor(1000);
      vi.setSystemTime(Date.now() + 1001);
      await h.check('db').attempt(fn).cacheFor(1000);
      expect(fn).toHaveBeenCalledTimes(2);
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

    it('should not share the degraded settings between attempts with the same key', async () => {
      const lenient = await h
        .check('db')
        .attempt(fail)
        .degradedOnFailure()
        .cacheFor(1000);
      const strict = await h.check('db').attempt(fail).cacheFor(1000);

      expect(lenient.db.status).toBe('degraded');
      expect(strict.db).toMatchObject({ status: 'down', cachedResponse: true });

      const slow = await h
        .check('api')
        .attempt(async () => {})
        .cacheFor(1000);
      const picky = await h
        .check('api')
        .attempt(async () => {})
        .degradedAfter(0)
        .cacheFor(1000);

      expect(slow.api.status).toBe('up');
      expect(picky.api).toMatchObject({
        status: 'degraded',
        cachedResponse: true,
      });
    });
  });

  describe('degradedAfter', () => {
    it('should accept a duration string', async () => {
      const slow = await session.attempt(() => sleep(30)).degradedAfter('10ms');
      const fast = await session.attempt(() => {}).degradedAfter('1s');
      expect(slow.test.status).toBe('degraded');
      expect(fast.test.status).toBe('up');
    });

    it('should stay up when faster than the threshold', async () => {
      const result = await session.attempt(() => {}).degradedAfter(1000);
      expect(result).toEqual({
        test: { status: 'up', responseTime: expect.any(Number) },
      });
    });

    it('should mark a slow success as degraded with the success data, without failure data', async () => {
      const failureData = vi.fn(() => ({ code: 'x' }));
      const result = await session
        .attempt(() => sleep(30))
        .withSuccessData({ ok: true })
        .withFailureData(failureData)
        .degradedAfter(10);
      expect(result).toEqual({
        test: {
          status: 'degraded',
          ok: true,
          responseTime: expect.any(Number),
        },
      });
      expect(result.test.responseTime).toBeGreaterThanOrEqual(10);
      expect(failureData).not.toHaveBeenCalled();
    });

    it('should mark as degraded when the response time equals the threshold', async () => {
      const result = await session.attempt(() => {}).degradedAfter(0);
      expect(result.test.status).toBe('degraded');
    });

    it('should not change a failure', async () => {
      const result = await session.attempt(fail).degradedAfter(0);
      expect(result).toEqual({
        test: {
          status: 'down',
          message: 'payment failed: EPAY',
          responseTime: expect.any(Number),
        },
      });
    });

    it.each([
      ['degradedAfter().withTimeout()', true],
      ['withTimeout().degradedAfter()', false],
    ])('should not depend on the builder order (%s)', async (_, first) => {
      const build = (fn: () => Promise<void>) => {
        const attempt = session.attempt(fn);
        if (first) {
          return attempt.degradedAfter(10).withTimeout(100);
        }
        return attempt.withTimeout(100).degradedAfter(10);
      };
      expect((await build(() => sleep(30))).test.status).toBe('degraded');
      expect((await build(() => sleep(5000))).test).toMatchObject({
        status: 'down',
        message: 'timeout of 100ms exceeded',
      });
    });
  });

  describe('degradedOnFailure', () => {
    it('should stay up when the function succeeds', async () => {
      const result = await session.attempt(() => {}).degradedOnFailure();
      expect(result).toEqual({
        test: { status: 'up', responseTime: expect.any(Number) },
      });
    });

    it.each([
      ['throws', fail, 'payment failed: EPAY'],
      [
        'rejects',
        async () => {
          throw new Error('refused');
        },
        'refused',
      ],
      ['times out', () => sleep(5000), 'timeout of 50ms exceeded'],
    ])(
      'should mark as degraded with the message, without success data, when the function %s',
      async (_, fn, message) => {
        const pick = vi.fn(() => ({ foo: 'bar' }));
        const result = await session
          .attempt(fn)
          .degradedOnFailure()
          .withSuccessData(pick)
          .withTimeout(50);
        expect(result).toEqual({
          test: {
            status: 'degraded',
            message,
            responseTime: expect.any(Number),
          },
        });
        expect(pick).not.toHaveBeenCalled();
      },
    );

    it('should combine with degradedAfter', async () => {
      const slow = await session
        .attempt(() => sleep(30))
        .degradedOnFailure()
        .degradedAfter(10);
      expect(slow.test.status).toBe('degraded');

      const failed = await session
        .attempt(fail)
        .degradedAfter(10)
        .degradedOnFailure();
      expect(failed.test).toMatchObject({
        status: 'degraded',
        message: 'payment failed: EPAY',
      });
    });

    it('should cache the degraded status', async () => {
      const h = new HealthIndicatorService();
      const fn = vi.fn(fail);
      await h.check('db').attempt(fn).degradedOnFailure().cacheFor(1000);
      const second = await h
        .check('db')
        .attempt(fn)
        .cacheFor(1000)
        .degradedOnFailure();
      expect(fn).toHaveBeenCalledTimes(1);
      expect(second).toEqual({
        db: {
          status: 'degraded',
          message: 'payment failed: EPAY',
          responseTime: expect.any(Number),
          cachedResponse: true,
        },
      });
    });

    it('should keep the health check up with an overall degraded status', async () => {
      const executor = new HealthCheckExecutor(
        { log: vi.fn(), error: vi.fn(), warn: vi.fn() },
        {},
      );
      const h = new HealthIndicatorService();
      const result = await executor.execute([
        h.check('db').attempt(fail).degradedOnFailure(),
        () =>
          h
            .check('cache')
            .attempt(() => {})
            .degradedAfter(0),
      ]);
      expect(result).toMatchObject({
        status: 'degraded',
        info: {
          db: { status: 'degraded', message: 'payment failed: EPAY' },
          cache: { status: 'degraded' },
        },
        error: {},
      });
    });
  });
});

describe('HealthCheckAttempt as a promise', () => {
  let session: HealthIndicatorSession<'test'>;

  beforeEach(() => {
    session = new HealthIndicatorSession('test');
  });

  it('should be assignable to a Promise', async () => {
    const promise: Promise<{ test: { status: string } }> = session.attempt(
      () => {},
    );

    expect((await promise).test.status).toBe('up');
    expect(Object.prototype.toString.call(promise)).toBe(
      '[object HealthCheckAttempt]',
    );
  });

  it('should resolve through catch() without calling the handler', async () => {
    const onRejected = vi.fn();

    const result = await session
      .attempt(() => {
        throw new Error('boom');
      })
      .catch(onRejected);

    // A failing check is a `down` result, not a rejection
    expect(result).toMatchObject({ test: { status: 'down', message: 'boom' } });
    expect(onRejected).not.toHaveBeenCalled();
  });

  it('should call the finally() handler and keep the result', async () => {
    const onFinally = vi.fn();

    const result = await session.attempt(() => {}).finally(onFinally);

    expect(result.test.status).toBe('up');
    expect(onFinally).toHaveBeenCalledTimes(1);
  });

  it('should work with Promise.all', async () => {
    const [first, second] = await Promise.all([
      session.attempt(() => {}),
      session.attempt(() => {}).catch(() => null),
    ]);

    expect(first.test.status).toBe('up');
    expect(second?.test.status).toBe('up');
  });
});
