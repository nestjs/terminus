import { ShutdownSignal } from '@nestjs/common';
import { type NestApplicationContext } from '@nestjs/core';
import * as request from 'supertest';
import { bootstrapTestingModule } from './helper';
import { sleep } from '../lib/utils';

describe('Graceful shutdown', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should gracefully shutdown the application', async () => {
    jest.spyOn(global, 'setTimeout');
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

    await sleep(16);
    // 1. setTimeout is called by the `GracefulShutdownService`
    // 2. setTimeout is called above
    expect(setTimeout).toHaveBeenCalledTimes(2);
    expect(isClosed).toBe(false);
    await sleep(16);
    expect(isClosed).toBe(false);
    await sleep(16);
    expect(isClosed).toBe(false);
    await sleep(64);
    expect(isClosed).toBe(true);
  });

  it('should not delay the shutdown if the application if the timeout is 0', async () => {
    jest.spyOn(global, 'setTimeout');
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

    expect(setTimeout).not.toHaveBeenCalled();
  });
});
