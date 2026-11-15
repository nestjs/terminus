import { expectTypeOf } from 'vitest';
import { type HealthCheckAttempt } from './health-check-attempt.js';
import { HealthIndicatorSession } from './health-indicator-session.js';
import { type HealthIndicatorResult } from './health-indicator-result.interface.js';

class PaymentError extends Error {
  constructor(public readonly code: string) {
    super(`payment failed: ${code}`);
  }
}

describe('HealthCheckAttempt types', () => {
  let session: HealthIndicatorSession<'test'>;

  beforeEach(() => {
    session = new HealthIndicatorSession('test');
  });

  it('should type the success and the failure entry', async () => {
    const result = await session
      .attempt(() => ({ region: 'eu' as string, secret: 'shh' }))
      .withData({ owner: 'team-billing' })
      .withSuccessData((res) => ({ region: res.region }))
      .withFailureData((error) => ({ code: (error as PaymentError).code }));

    expectTypeOf(result.test.owner).toEqualTypeOf<'team-billing'>();
    expectTypeOf(result.test.responseTime).toEqualTypeOf<number>();
    expectTypeOf(result.test.cachedResponse).toEqualTypeOf<true | undefined>();
    if (result.test.status === 'up') {
      expectTypeOf(result.test.region).toEqualTypeOf<string>();
      // @ts-expect-error the raw return value is not part of the result
      void result.test.secret;
      // @ts-expect-error the failure data is not in a successful result
      void result.test.code;
      // @ts-expect-error a successful result has no message
      void result.test.message;
    }
    if (result.test.status === 'down') {
      expectTypeOf(result.test.message).toEqualTypeOf<string>();
      expectTypeOf(result.test.code).toEqualTypeOf<string>();
      // @ts-expect-error the success data is not in a failed result
      void result.test.region;
    }
    if (result.test.status === 'degraded') {
      // a slow success or a degraded failure: only the shared fields are known
      expectTypeOf(result.test.owner).toEqualTypeOf<'team-billing'>();
      // @ts-expect-error only a failed result has a message
      void result.test.message;
    }
  });

  it('should type async and literal success data', async () => {
    const asyncResult = await session
      .attempt(() => ({ ok: 1 }))
      .withSuccessData(async (res) => ({ ok: res.ok === 1 }));
    if (asyncResult.test.status === 'up') {
      expectTypeOf(asyncResult.test.ok).toEqualTypeOf<boolean>();
    }

    const literalResult = await session
      .attempt(() => {})
      .withSuccessData(() => ({ region: 'eu', tags: ['a', 'b'] }));
    if (literalResult.test.status === 'up') {
      expectTypeOf(literalResult.test.region).toEqualTypeOf<'eu'>();
      expectTypeOf(literalResult.test.tags).toEqualTypeOf<
        readonly ['a', 'b']
      >();
    }
  });

  it('should type merged calls: the later type replaces the earlier key', async () => {
    const clash = await session
      .attempt(() => {})
      .withData({ owner: 'asdf', a: 'a' })
      .withData({ b: 'b', owner: 'b' });
    expectTypeOf(clash.test.owner).toEqualTypeOf<'b'>();
    expectTypeOf(clash.test.a).toEqualTypeOf<'a'>();

    const three = await session
      .attempt(() => {})
      .withSuccessData({ a: 1, keep: true })
      .withSuccessData(() => ({ b: 2 }))
      .withSuccessData(async () => ({ a: 'x' }));
    if (three.test.status === 'up') {
      expectTypeOf(three.test.a).toEqualTypeOf<'x'>();
      expectTypeOf(three.test.b).toEqualTypeOf<2>();
      expectTypeOf(three.test.keep).toEqualTypeOf<true>();
    }

    const failure = await session
      .attempt(() => {})
      .withData({ code: 1 })
      .withFailureData({ code: 'a' })
      .withFailureData({ code: 'b', extra: 1 })
      .withFailureData({ more: 2 });
    if (failure.test.status === 'down') {
      expectTypeOf(failure.test.code).toEqualTypeOf<'b'>();
      expectTypeOf(failure.test.extra).toEqualTypeOf<1>();
      expectTypeOf(failure.test.more).toEqualTypeOf<2>();
    }
    if (failure.test.status === 'up') {
      // the success data has no `code`, so the static one stays
      expectTypeOf(failure.test.code).toEqualTypeOf<1>();
    }
  });

  it('should not change the type with cacheFor, degradedAfter and degradedOnFailure', async () => {
    const plain = session.attempt(() => {}).withData({ owner: 'x' });
    const built = session
      .attempt(() => {})
      .withData({ owner: 'x' })
      .cacheFor(1000)
      .degradedAfter(200)
      .degradedOnFailure()
      .withTimeout(1000);
    expectTypeOf(built).toEqualTypeOf(plain);

    const result = await built;
    expectTypeOf(result.test.status).toEqualTypeOf<
      'up' | 'degraded' | 'down'
    >();
    expectTypeOf(result.test.cachedResponse).toEqualTypeOf<true | undefined>();
    expectTypeOf(result.test.owner).toEqualTypeOf<'x'>();
  });

  it('should infer the result type from the attempt function', () => {
    session
      .attempt(async () => ({ ok: 1 as const }))
      .withSuccessData((res) => {
        expectTypeOf(res).toEqualTypeOf<{ ok: 1 }>();
        return {};
      });
    session
      .attempt(() => {})
      .withFailureData((error) => {
        expectTypeOf(error).toEqualTypeOf<unknown>();
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
      .withSuccessData((res) =>
        res.ok ? { ok: true } : { ok: false, reason: 'x' },
      );
    session.attempt(() => info).withSuccessData((res) => res.server);
    session.attempt(() => info).withSuccessData(async (res) => res.server);
    // the success data can use message
    session.attempt(() => {}).withSuccessData(() => ({ message: 'x' }));
  });

  it('should not allow primitives as data', () => {
    // @ts-expect-error primitives are not allowed
    session.attempt(() => {}).withData('x');
    // @ts-expect-error primitives are not allowed
    session.attempt(() => {}).withSuccessData(1);
    // @ts-expect-error primitives are not allowed
    session.attempt(() => {}).withFailureData('x');
  });

  it('should keep any attempt assignable to the untyped types', () => {
    const typed = session.attempt(() => 1).withData({ owner: 'x' });
    const attempts = [
      typed,
      typed.cacheFor(1000),
      typed.degradedAfter(200),
      typed.degradedOnFailure(),
      typed
        .withSuccessData((n) => ({ n }))
        .withFailureData({ code: 'x' })
        .cacheFor(1000)
        .degradedOnFailure()
        .degradedAfter(10),
    ];
    for (const attempt of attempts) {
      expectTypeOf(attempt).toExtend<HealthCheckAttempt<'test'>>();
      expectTypeOf(attempt).toExtend<
        PromiseLike<HealthIndicatorResult<'test'>>
      >();
    }
  });

  it('should let a user add data to an untyped (built-in) attempt', async () => {
    const builtIn: HealthCheckAttempt<'test'> = session
      .attempt(() => ({ statusCode: 1 }))
      .withSuccessData((res) => res);
    const result = await builtIn
      .withData({ owner: 'x' })
      .withSuccessData({ extra: 1 });
    expect(result.test).toEqual({
      status: 'up',
      statusCode: 1,
      owner: 'x',
      extra: 1,
      responseTime: expect.any(Number),
    });
    expectTypeOf(result.test.owner).toEqualTypeOf<'x'>();
  });
});
