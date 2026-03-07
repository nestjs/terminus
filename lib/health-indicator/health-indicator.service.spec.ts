import {
  HealthCheckAttempt,
  HealthIndicatorService,
  HealthIndicatorSession,
} from './health-indicator.service';

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
      const attempt = session.attempt((signal) => {
        receivedSignal = signal;
      });
      await attempt.execute();
      expect(receivedSignal).toBeInstanceOf(AbortSignal);
    });

    it('should return up when the function succeeds (void)', async () => {
      const attempt = session.attempt(() => {});
      const result = await attempt.execute();
      expect(result).toEqual({ test: { status: 'up' } });
    });

    it('should return up when the async function succeeds (void)', async () => {
      const attempt = session.attempt(async () => {});
      const result = await attempt.execute();
      expect(result).toEqual({ test: { status: 'up' } });
    });

    it('should return up with additional data when function returns data', async () => {
      const attempt = session.attempt(() => ({ foo: 'bar' }));
      const result = await attempt.execute();
      expect(result).toEqual({ test: { status: 'up', foo: 'bar' } });
    });

    it('should return up with additional data when async function returns data', async () => {
      const attempt = session.attempt(async () => ({ version: '1.0' }));
      const result = await attempt.execute();
      expect(result).toEqual({ test: { status: 'up', version: '1.0' } });
    });

    it('should return down when the function throws', async () => {
      const attempt = session.attempt(() => {
        throw new Error('Something broke');
      });
      const result = await attempt.execute();
      expect(result).toEqual({
        test: { status: 'down', error: 'Something broke' },
      });
    });

    it('should return down when the async function rejects', async () => {
      const attempt = session.attempt(async () => {
        throw new Error('Connection refused');
      });
      const result = await attempt.execute();
      expect(result).toEqual({
        test: { status: 'down', error: 'Connection refused' },
      });
    });

    it('should handle non-Error throws', async () => {
      const attempt = session.attempt(() => {
        throw 'string error';
      });
      const result = await attempt.execute();
      expect(result).toEqual({
        test: { status: 'down', error: 'string error' },
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
      const result = await attempt.execute();
      expect(result).toEqual({ test: { status: 'up' } });
    });

    it('should return down when function exceeds timeout', async () => {
      const attempt = session
        .attempt(
          async () => new Promise<void>((resolve) => setTimeout(resolve, 5000)),
        )
        .withTimeout(50);
      const result = await attempt.execute();
      expect(result).toEqual({
        test: {
          status: 'down',
          error: expect.stringContaining('timed out'),
        },
      });
    });

    it('should abort the signal when timeout fires', async () => {
      let receivedSignal: AbortSignal | undefined;
      const attempt = session
        .attempt(async (signal) => {
          receivedSignal = signal;
          return new Promise<void>((resolve) => setTimeout(resolve, 5000));
        })
        .withTimeout(50);
      await attempt.execute();
      expect(receivedSignal?.aborted).toBe(true);
    });
  });
});
