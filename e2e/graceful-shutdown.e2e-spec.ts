import * as timers from 'node:timers/promises';
import { ShutdownSignal } from '@nestjs/common';
import { type NestApplicationContext } from '@nestjs/core';
import request from 'supertest';
import { bootstrapTestingModule } from './helper/index.js';

vi.mock('node:timers/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:timers/promises')>();
  return { ...actual, setTimeout: vi.fn(actual.setTimeout) };
});

describe('Graceful shutdown', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should gracefully shutdown the application', async () => {
    const setHealthEndpoint = bootstrapTestingModule({
      gracefulShutdownTimeoutMs: 64,
    }).setHealthEndpoint;

    const app = await setHealthEndpoint(({ healthCheck }) =>
      healthCheck.check([]),
    ).start();

    const { status } = await request(app.getHttpServer()).get('/health');

    expect(status).toBe(200);

    let isClosed = false;
    (app.close as NestApplicationContext['close'])(ShutdownSignal.SIGTERM).then(
      () => {
        isClosed = true;
      },
    );

    await timers.setTimeout(16);
    // 1. setTimeout is called by the `HealthCheckExecutor`
    // 2. setTimeout is called above
    expect(timers.setTimeout).toHaveBeenCalledTimes(2);
    expect(isClosed).toBe(false);
    const drain = await request(app.getHttpServer()).get('/health');
    expect(drain.status).toBe(503);
    expect(drain.body.status).toBe('shutting_down');
    await timers.setTimeout(16);
    expect(isClosed).toBe(false);
    await timers.setTimeout(16);
    expect(isClosed).toBe(false);
    await timers.setTimeout(64);
    expect(isClosed).toBe(true);
  });

  it('should not delay the shutdown if the application if the timeout is 0', async () => {
    const setHealthEndpoint = bootstrapTestingModule({
      gracefulShutdownTimeoutMs: 0,
    }).setHealthEndpoint;

    const app = await setHealthEndpoint(({ healthCheck }) =>
      healthCheck.check([]),
    ).start();

    const { status } = await request(app.getHttpServer()).get('/health');

    expect(status).toBe(200);

    await (app.close as NestApplicationContext['close'])(
      ShutdownSignal.SIGTERM,
    );

    expect(timers.setTimeout).not.toHaveBeenCalled();
  });
});
