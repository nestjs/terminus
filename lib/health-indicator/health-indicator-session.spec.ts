import { HealthCheckAttempt } from './health-check-attempt.js';
import { HealthIndicatorSession } from './health-indicator-session.js';

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

    it('should allow responseTime as additional data key (only reserved within attempt)', () => {
      expect(session.up({ responseTime: 5 })).toEqual({
        test: { status: 'up', responseTime: 5 },
      });
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
