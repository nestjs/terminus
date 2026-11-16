import { createServer, type Server } from 'node:http';
import { type AddressInfo } from 'node:net';
import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { CacheService } from '../src/cache/cache.service.js';
import { EmailQueueService } from '../src/emails/email-queue.service.js';

describe('Health (e2e)', () => {
  let payments: Server;
  let paymentsStatus = 200;
  let app: INestApplication;

  async function createApp(overrides: [unknown, unknown][] = []) {
    const builder = Test.createTestingModule({ imports: [AppModule] });
    for (const [provider, value] of overrides) {
      builder.overrideProvider(provider).useValue(value);
    }
    app = (await builder.compile()).createNestApplication();
    await app.init();
    return request(app.getHttpServer());
  }

  beforeAll(async () => {
    payments = createServer((_, res) => res.writeHead(paymentsStatus).end());
    await new Promise<void>((resolve) => payments.listen(0, resolve));
    const { port } = payments.address() as AddressInfo;
    process.env.PAYMENTS_URL = `http://127.0.0.1:${port}`;
    // The disk of the machine that runs the tests must not fail them
    process.env.STORAGE_THRESHOLD_PERCENT = '1';
    process.env.TERMINUS_ERROR_LOG_STYLE = 'json';
  });

  beforeEach(() => {
    paymentsStatus = 200;
  });
  afterEach(() => app.close());
  afterAll(() => payments.close());

  it('/health/live is ok without indicators', async () => {
    const http = await createApp();

    await http
      .get('/health/live')
      .expect(200)
      .expect({ status: 'ok', info: {}, error: {}, details: {} });
  });

  it('/health/ready is ok when every dependency answers', async () => {
    const http = await createApp();

    const { body } = await http.get('/health/ready').expect(200);

    expect(body.status).toBe('ok');
    expect(body.details).toMatchObject({
      payments: { status: 'up', owner: 'team-payments' },
      email_queue: { status: 'up', waiting: 0 },
      cache: { status: 'up' },
      storage: { status: 'up' },
    });
  });

  it('/health/ready is degraded, with a 200, when only optional parts fail', async () => {
    const http = await createApp([
      [
        EmailQueueService,
        { getWaitingCount: () => Promise.reject(new Error('queue is down')) },
      ],
      [CacheService, { isConnected: async () => false }],
    ]);

    const { body } = await http.get('/health/ready').expect(200);

    expect(body.status).toBe('degraded');
    expect(body.info).toMatchObject({
      email_queue: { status: 'degraded', message: 'queue is down' },
      cache: {
        status: 'degraded',
        message: 'cache unreachable, serving without cache',
      },
    });
  });

  it('/health/ready is an error, with a 503, when payments fail', async () => {
    paymentsStatus = 503;
    const http = await createApp();

    const { body } = await http.get('/health/ready').expect(503);

    expect(body.status).toBe('error');
    expect(body.error.payments).toMatchObject({
      status: 'down',
      statusCode: 503,
      owner: 'team-payments',
    });
  });
});
