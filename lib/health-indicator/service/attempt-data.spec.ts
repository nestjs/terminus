import { Logger } from '@nestjs/common';
import { type MockInstance } from 'vitest';
import { AttemptData } from './attempt-data.js';

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

describe('AttemptData', () => {
  let warn: MockInstance;

  // Warnings are logged once per indicator key for the whole process, so each
  // test uses its own key: the test name.
  const key = () => expect.getState().currentTestName!;
  const create = (suffix = '') => new AttemptData(key() + suffix);
  const warnings = (text: string) =>
    warn.mock.calls.map(([msg]) => String(msg)).filter((m) => m.includes(text));

  beforeEach(() => {
    warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('static data', () => {
    it('should merge calls, the last one wins', () => {
      const data = create();
      data.addStatic({ owner: 'asdf', a: 'a' });
      data.addStatic({ b: 'b', owner: 'b' });
      expect(Object.entries(data.staticData)).toEqual([
        ['owner', 'b'],
        ['a', 'a'],
        ['b', 'b'],
      ]);
    });

    it('should copy the object, so changing it later has no effect', () => {
      const data = create();
      const labels = { owner: 'a' };
      data.addStatic(labels);
      labels.owner = 'b';
      expect(data.staticData).toEqual({ owner: 'a' });
    });

    it.each(['status', 'responseTime', 'cachedResponse'])(
      'should drop the reserved key "%s" with a warning once per indicator',
      (reserved) => {
        const data = create();
        data.addStatic({ [reserved]: 'x', foo: 'bar' });
        data.addStatic({ [reserved]: 'x', baz: 1 });
        expect(data.staticData).toEqual({ foo: 'bar', baz: 1 });
        expect(warnings('reserved key')).toEqual([
          `Ignoring reserved key(s) "${reserved}" in the data of health indicator "${key()}". ` +
            'The keys status, responseTime, cachedResponse are set by Terminus, use other names.',
        ]);
      },
    );
  });

  describe('success data', () => {
    it('should run every function with the result and merge the data in call order', async () => {
      const data = create();
      const first = vi.fn((res: { a: number }) => ({ a: res.a, x: 1 }));
      data.addSuccess(first);
      data.addSuccess({ b: 2 });
      data.addSuccess(async () => ({ x: 2 }));
      const result = await data.forSuccess({ a: 1, secret: 'shh' });
      expect(first).toHaveBeenCalledWith({ a: 1, secret: 'shh' });
      expect(result).toEqual({ a: 1, x: 2, b: 2 });
    });

    it.each([
      [
        'throws',
        () => {
          throw new Error('pick failed');
        },
      ],
      [
        'rejects',
        async () => {
          throw new Error('pick failed');
        },
      ],
    ])('should throw when a function %s', async (_, pick) => {
      const data = create();
      data.addSuccess(() => ({ a: 1 }));
      data.addSuccess(pick);
      await expect(data.forSuccess({})).rejects.toThrow('pick failed');
    });

    it.each(['status', 'responseTime', 'cachedResponse'])(
      'should drop the reserved key "%s"',
      async (reserved) => {
        const data = create();
        data.addSuccess(() => ({ [reserved]: 'x', foo: 'bar' }));
        expect(await data.forSuccess(undefined)).toEqual({ foo: 'bar' });
      },
    );

    it('should allow message', async () => {
      const data = create();
      data.addSuccess({ message: 'all good' });
      expect(await data.forSuccess(undefined)).toEqual({ message: 'all good' });
    });

    it('should warn about reserved keys once per indicator', async () => {
      for (const suffix of ['', '', ':b']) {
        const data = create(suffix);
        data.addSuccess({ status: 200 });
        await data.forSuccess(undefined);
      }
      const reserved = warnings('reserved key');
      expect(reserved).toHaveLength(2);
      expect(reserved[0]).toContain('"status"');
      expect(reserved[1]).toContain(`indicator "${key()}:b"`);
    });

    // FIXME: Remove this in v13, the returned value is ignored (#2796)
    describe('without withSuccessData() (deprecated)', () => {
      it('should add the returned value, with a warning once per indicator', async () => {
        expect(await create().forSuccess({ ok: 1 })).toEqual({ ok: 1 });
        await create().forSuccess({ ok: 1 });
        await create(':b').forSuccess({ ok: 1 });
        const deprecation = warnings('withSuccessData()');
        expect(deprecation).toEqual([
          `The value returned by attempt() for health indicator "${key()}" is added to the health check result. ` +
            'This is deprecated: the next major version ignores it. Use .withSuccessData() to choose the data to add, or return nothing.',
          expect.stringContaining(`"${key()}:b"`),
        ]);
      });

      it('should still add the returned value when only static data is set', async () => {
        const data = create();
        data.addStatic({ owner: 'x' });
        expect(await data.forSuccess({ ok: 1 })).toEqual({ ok: 1 });
        expect(warnings('withSuccessData()')).toHaveLength(1);
      });

      it('should use withSuccessData() instead of the returned value, without a warning', async () => {
        const data = create();
        data.addSuccess(() => ({}));
        expect(await data.forSuccess({ ok: 1 })).toEqual({});
        expect(warnings('withSuccessData()')).toHaveLength(0);
      });

      it.each([undefined, {}, null, 'ok', 42, true, [1, 2]])(
        'should add nothing and not warn for %p',
        async (value) => {
          expect(await create().forSuccess(value)).toEqual({});
          expect(warn).not.toHaveBeenCalled();
        },
      );

      it.each(['status', 'responseTime', 'cachedResponse'])(
        'should drop the reserved key "%s"',
        async (reserved) => {
          const result = await create().forSuccess({
            [reserved]: 'x',
            foo: 'bar',
          });
          expect(result).toEqual({ foo: 'bar' });
        },
      );

      it('should handle a circular reference with a reserved key (e.g. an axios response)', async () => {
        const response: Record<string, unknown> = { status: 200, data: 'ok' };
        response.request = { res: response };
        expect(await create().forSuccess(response)).toEqual({
          data: 'ok',
          request: { res: response },
        });
      });
    });
  });

  describe('failure data', () => {
    it('should allow message, to replace the error message', async () => {
      const data = create();
      data.addFailure(() => ({ message: 'Database is not reachable' }));
      expect(await data.forFailure(new Error('boom'), undefined, 0)).toEqual({
        message: 'Database is not reachable',
      });
    });

    const error = new Error('boom');

    it('should be empty without withFailureData()', async () => {
      expect(await create().forFailure(error, undefined, 0)).toEqual({});
    });

    it('should run every function with the error and merge the data in call order', async () => {
      const data = create();
      const pick = vi.fn((err: unknown) => ({
        reason: (err as Error).message,
        code: 'a',
      }));
      data.addFailure(pick);
      data.addFailure({ code: 'b', a: 1 });
      data.addFailure(async () => ({ code: 'c' }));
      const result = await data.forFailure(error, undefined, 0);
      expect(pick).toHaveBeenCalledWith(error);
      expect(result).toEqual({ reason: 'boom', code: 'c', a: 1 });
    });

    it.each(['status', 'responseTime', 'cachedResponse'])(
      'should drop the reserved key "%s"',
      async (reserved) => {
        const data = create();
        data.addFailure(() => ({ [reserved]: 'x', foo: 'bar' }));
        expect(await data.forFailure(error, undefined, 0)).toEqual({
          foo: 'bar',
        });
      },
    );

    it.each([
      [
        'throws',
        () => {
          throw new Error('pick failed');
        },
      ],
      [
        'rejects',
        async () => {
          throw new Error('pick failed');
        },
      ],
      ['returns null', () => null],
      ['returns a string', () => 'oops'],
      ['returns an array', () => [1]],
    ])(
      'should skip a function that %s and keep the other data',
      async (_, pick) => {
        const data = create();
        data.addFailure({ a: 1 });
        data.addFailure(pick);
        data.addFailure({ b: 2 });
        expect(await data.forFailure(error, undefined, 0)).toEqual({
          a: 1,
          b: 2,
        });
      },
    );

    it('should warn once per indicator when a function fails', async () => {
      const data = create();
      data.addFailure(() => {
        throw new Error('pick failed');
      });
      await data.forFailure(error, undefined, 0);
      await data.forFailure(error, undefined, 0);
      expect(warnings('withFailureData()')).toEqual([
        `Could not add the failure data to health indicator "${key()}", withFailureData() failed: pick failed`,
      ]);
    });

    it('should run each function in what is left of the timeout', async () => {
      const data = create();
      data.addFailure(() => sleep(5000).then(() => ({ late: true })));
      data.addFailure({ code: 'x' });
      const start = performance.now();
      // 30ms of a 50ms timeout are used, 20ms are left
      const result = await data.forFailure(error, 50, start - 30);
      expect(result).toEqual({ code: 'x' });
      expect(performance.now() - start).toBeLessThan(500);
      const [, remainingMs] = /timeout of (\d+)ms/.exec(
        warnings('withFailureData()')[0],
      )!;
      expect(Number(remainingMs)).toBeGreaterThan(10);
      expect(Number(remainingMs)).toBeLessThanOrEqual(20);
    });

    it('should still run a sync function when the timeout has passed', async () => {
      const data = create();
      data.addFailure(() => ({ sync: true }));
      data.addFailure(async () => ({ async: true }));
      const start = performance.now();
      expect(await data.forFailure(error, 50, start - 1000)).toEqual({
        sync: true,
        async: true,
      });
    });
  });
});
