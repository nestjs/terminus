import {
  HealthCheckAttempt,
  HealthIndicatorService,
  HealthIndicatorSession,
} from './health-indicator.service.js';

describe('HealthIndicatorService', () => {
  let service: HealthIndicatorService;

  beforeEach(() => {
    service = new HealthIndicatorService();
  });

  describe('check', () => {
    it('should return a HealthIndicatorSession', () => {
      const session = service.check('test');
      expect(session).toBeInstanceOf(HealthIndicatorSession);
    });
  });
});

describe('HealthIndicatorSession', () => {
  let session: HealthIndicatorSession<'test'>;

  beforeEach(() => {
    session = new HealthIndicatorSession('test');
  });

  describe('up', () => {
    it('should return an up result', () => {
      expect(session.up()).toEqual({ test: { status: 'up' } });
    });

    it('should return an up result with additional data', () => {
      expect(session.up({ foo: 'bar' })).toEqual({
        test: { status: 'up', foo: 'bar' },
      });
    });

    it('should return an up result with a message string', () => {
      expect(session.up('hello')).toEqual({
        test: { status: 'up', message: 'hello' },
      });
    });

    it('should throw if status is used as additional data key', () => {
      expect(() => session.up({ status: 'foo' } as any)).toThrow(
        '"status" is a reserved key',
      );
    });
  });

  describe('degraded', () => {
    it('should return a degraded result', () => {
      expect(session.degraded()).toEqual({ test: { status: 'degraded' } });
    });

    it('should return a degraded result with a message string', () => {
      expect(session.degraded('slow')).toEqual({
        test: { status: 'degraded', message: 'slow' },
      });
    });

    it('should throw if status is used as additional data key', () => {
      expect(() => session.degraded({ status: 'foo' } as any)).toThrow(
        '"status" is a reserved key',
      );
    });
  });

  describe('down', () => {
    it('should return a down result', () => {
      expect(session.down()).toEqual({ test: { status: 'down' } });
    });

    it('should return a down result with additional data', () => {
      expect(session.down({ reason: 'timeout' })).toEqual({
        test: { status: 'down', reason: 'timeout' },
      });
    });

    it('should return a down result with a message string', () => {
      expect(session.down('broken')).toEqual({
        test: { status: 'down', message: 'broken' },
      });
    });
  });

  describe('attempt', () => {
    it('should return a HealthCheckAttempt', () => {
      const attempt = session.attempt(() => {});
      expect(attempt).toBeInstanceOf(HealthCheckAttempt);
    });
  });
});

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

    it('should return up with additional data when function returns data', async () => {
      const attempt = session.attempt(() => ({ foo: 'bar' }));
      const result = await attempt;
      expect(result).toEqual({
        test: { status: 'up', foo: 'bar', responseTime: expect.any(Number) },
      });
    });

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
